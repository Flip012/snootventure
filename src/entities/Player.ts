import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import type { TouchInput } from '../systems/TouchControls';
import { Entity } from './Entity';
import {
  applyVariableJumpCut,
  canJump,
  computeHorizontalVelocity,
  updateCoyote,
  updateJumpBuffer,
} from './movement';

/** Snapshot of the player's internal state for the debug overlay (M4). */
export interface PlayerDebugState {
  grounded: boolean;
  coyoteMs: number;
  jumpBufferMs: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Depth for the always-visible glowing eyes — above the darkness overlay. */
const EYE_DEPTH = 600;

/**
 * The player entity. Its physics body lives in canonical world coordinates
 * (inherited from `Entity`). In the dark art direction the body is only a faint
 * silhouette (visible when lit); the two glowing eyes are drawn above the
 * darkness so they are always visible. Cast shadows are drawn by `LightingSystem`
 * into `shadowGfx` (an underlay inside the layer container).
 */
export class Player extends Entity {
  private readonly cfg = GameConfig.player;

  /** Cast-shadow graphics — an underlay under the body, filled by lighting. */
  readonly shadowGfx: Phaser.GameObjects.Graphics;

  private readonly eyesGfx: Phaser.GameObjects.Graphics;
  private readonly eyeGlowLeft: Phaser.GameObjects.Image;
  private readonly eyeGlowRight: Phaser.GameObjects.Image;

  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private isJumping = false;
  private facing: -1 | 1 = 1;

  private readonly keyLeft: Phaser.Input.Keyboard.Key;
  private readonly keyRight: Phaser.Input.Keyboard.Key;
  private readonly keyJump: Phaser.Input.Keyboard.Key;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly touch: TouchInput | null;

  constructor(scene: Phaser.Scene, x: number, y: number, touch: TouchInput | null = null) {
    super(scene, x, y, 'player', GameConfig.player.color);
    this.touch = touch;

    const body = this.body;
    body.setSize(this.cfg.width, this.cfg.height);
    body.setCollideWorldBounds(true);
    body.setMaxVelocityY(this.cfg.maxFallSpeed);

    // Shadow underlay lives inside the layer container, beneath the body.
    this.shadowGfx = scene.add.graphics();
    this.underlays.push(this.shadowGfx);

    // Eyes: additive glow + crisp pupils, above the darkness overlay.
    const eyeCfg = GameConfig.lighting.eyes;
    this.eyeGlowLeft = this.makeEyeGlow(scene, eyeCfg.color, eyeCfg.glowRadius, eyeCfg.glowAlpha);
    this.eyeGlowRight = this.makeEyeGlow(scene, eyeCfg.color, eyeCfg.glowRadius, eyeCfg.glowAlpha);
    this.eyesGfx = scene.add.graphics().setDepth(EYE_DEPTH + 1);

    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input plugin is required for the Player.');
    }
    this.keyLeft = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyRight = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyJump = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.cursors = keyboard.createCursorKeys();
  }

  private makeEyeGlow(
    scene: Phaser.Scene,
    color: number,
    radius: number,
    alpha: number,
  ): Phaser.GameObjects.Image {
    return scene.add
      .image(0, 0, 'radial')
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(alpha)
      .setDepth(EYE_DEPTH)
      .setDisplaySize(radius * 2, radius * 2);
  }

  get facingDir(): -1 | 1 {
    return this.facing;
  }

  get halfHeight(): number {
    return this.cfg.height / 2;
  }

  get bodyWidth(): number {
    return this.cfg.width;
  }

  /** Called every frame with the frame delta in milliseconds. */
  update(dtMs: number): void {
    const dtSec = dtMs / 1000;
    const body = this.body;
    const grounded = body.blocked.down || body.touching.down;

    // --- gather input (keyboard OR touch) ---
    const leftDown = this.keyLeft.isDown || this.cursors.left.isDown || (this.touch?.leftDown ?? false);
    const rightDown =
      this.keyRight.isDown || this.cursors.right.isDown || (this.touch?.rightDown ?? false);
    const moveDir: -1 | 0 | 1 = leftDown === rightDown ? 0 : leftDown ? -1 : 1;

    // Jump is Space or the touch button; arrow up/down stay reserved for layer
    // switching (M3). Poll touch first so its edge flags are always consumed.
    const touchJumpPressed = this.touch?.pollJumpPressed() ?? false;
    const touchJumpReleased = this.touch?.pollJumpReleased() ?? false;
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keyJump) || touchJumpPressed;
    const jumpReleased = Phaser.Input.Keyboard.JustUp(this.keyJump) || touchJumpReleased;

    // --- assist timers ---
    this.coyoteTimer = updateCoyote(this.coyoteTimer, grounded, this.cfg.coyoteMs, dtMs);
    this.jumpBufferTimer = updateJumpBuffer(
      this.jumpBufferTimer,
      jumpPressed,
      this.cfg.jumpBufferMs,
      dtMs,
    );

    // --- horizontal ---
    body.setVelocityX(computeHorizontalVelocity(body.velocity.x, moveDir, grounded, this.cfg, dtSec));
    if (moveDir !== 0) {
      this.facing = moveDir;
      this.display.setFlipX(moveDir < 0);
    }

    // --- jump start (buffered press within the coyote window) ---
    if (canJump(this.coyoteTimer, this.jumpBufferTimer)) {
      body.setVelocityY(this.cfg.jumpVelocity);
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.isJumping = true;
    }

    // --- variable jump height (release early → shorter hop) ---
    if (jumpReleased && this.isJumping && body.velocity.y < 0) {
      body.setVelocityY(applyVariableJumpCut(body.velocity.y, this.cfg));
      this.isJumping = false;
    }
    if (grounded && body.velocity.y >= 0) this.isJumping = false;

    // --- presentation follows the canonical body ---
    this.syncDisplay();
    this.updateEyes();
  }

  /** Position the glowing eyes from the body + facing direction. */
  private updateEyes(): void {
    const cfg = GameConfig.lighting.eyes;
    const cx = this.physics.x + this.facing * cfg.facingShift;
    const cy = this.physics.y + cfg.offsetY;
    const lx = cx - cfg.spacing / 2;
    const rx = cx + cfg.spacing / 2;

    this.eyeGlowLeft.setPosition(lx, cy);
    this.eyeGlowRight.setPosition(rx, cy);

    this.eyesGfx.clear();
    this.eyesGfx.fillStyle(cfg.color, 1);
    this.eyesGfx.fillCircle(lx, cy, cfg.radius);
    this.eyesGfx.fillCircle(rx, cy, cfg.radius);
  }

  getDebugState(): PlayerDebugState {
    const body = this.body;
    return {
      grounded: body.blocked.down || body.touching.down,
      coyoteMs: Math.round(this.coyoteTimer),
      jumpBufferMs: Math.round(this.jumpBufferTimer),
      x: Math.round(this.physics.x),
      y: Math.round(this.physics.y),
      vx: Math.round(body.velocity.x),
      vy: Math.round(body.velocity.y),
    };
  }
}
