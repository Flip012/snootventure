import Phaser from 'phaser';
import { GameConfig, layerColor } from '../config/GameConfig';
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

/**
 * The player entity. In M1 it lives directly in world space on a single layer.
 * From M2/M3 its physics body stays in canonical world coordinates while its
 * presentation is reparented into a layer container — see CLAUDE.md.
 */
export class Player {
  /** Arcade-physics sprite (body lives in canonical world coordinates). */
  public readonly sprite: Phaser.Physics.Arcade.Sprite;

  private readonly cfg = GameConfig.player;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private isJumping = false;

  private readonly keyLeft: Phaser.Input.Keyboard.Key;
  private readonly keyRight: Phaser.Input.Keyboard.Key;
  private readonly keyJump: Phaser.Input.Keyboard.Key;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setTint(layerColor(0));
    this.sprite.setDepth(10);

    const body = this.body;
    body.setSize(this.cfg.width, this.cfg.height);
    body.setCollideWorldBounds(true);
    body.setMaxVelocityY(this.cfg.maxFallSpeed);

    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input plugin is required for the Player.');
    }
    this.keyLeft = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyRight = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyJump = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.cursors = keyboard.createCursorKeys();
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  /** Called every frame with the frame delta in milliseconds. */
  update(dtMs: number): void {
    const dtSec = dtMs / 1000;
    const body = this.body;
    const grounded = body.blocked.down || body.touching.down;

    // --- gather input ---
    const leftDown = this.keyLeft.isDown || this.cursors.left.isDown;
    const rightDown = this.keyRight.isDown || this.cursors.right.isDown;
    const moveDir: -1 | 0 | 1 = leftDown === rightDown ? 0 : leftDown ? -1 : 1;

    // Jump is Space only; arrow up/down stay reserved for layer switching (M3).
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keyJump);
    const jumpReleased = Phaser.Input.Keyboard.JustUp(this.keyJump);

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
    if (moveDir !== 0) this.sprite.setFlipX(moveDir < 0);

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
  }

  getDebugState(): PlayerDebugState {
    const body = this.body;
    return {
      grounded: body.blocked.down || body.touching.down,
      coyoteMs: Math.round(this.coyoteTimer),
      jumpBufferMs: Math.round(this.jumpBufferTimer),
      x: Math.round(this.sprite.x),
      y: Math.round(this.sprite.y),
      vx: Math.round(body.velocity.x),
      vy: Math.round(body.velocity.y),
    };
  }
}
