import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import type { InputSample } from '../core/input';
import {
  applyHorizontal,
  clampFallSpeed,
  createJumpTimers,
  cutJumpVelocity,
  noteGrounded,
  noteJumpPressed,
  tryConsumeJump,
} from '../core/movement';

/**
 * M1: Der Player ist noch ein direkter Physics-Sprite auf einer Ebene.
 * Ab M2 wird er auf den Body/Display-Split der Entity-Basisklasse umgestellt
 * (unsichtbarer Body in kanonischen Koordinaten + Sprite im Layer-Container).
 */
export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly timers = createJumpTimers();
  /** true, solange der aktuelle Aufstieg noch nicht per Loslassen gekappt wurde */
  private jumpCutApplied = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setCollideWorldBounds(true);
    const body = this.body();
    body.setSize(GAME_CONFIG.playerWidth, GAME_CONFIG.playerHeight);
  }

  body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  isGrounded(): boolean {
    const body = this.body();
    return body.blocked.down || body.touching.down;
  }

  update(now: number, dtMs: number, input: InputSample): void {
    const body = this.body();
    const grounded = this.isGrounded();

    // Horizontal: Geschwindigkeit rein aus der puren Logik, deterministisch.
    body.setVelocityX(applyHorizontal(body.velocity.x, input.move, grounded, dtMs, GAME_CONFIG));

    // Sprung-Fenster pflegen.
    if (grounded) noteGrounded(this.timers, now, GAME_CONFIG.coyoteMs);
    if (input.jumpJustPressed) noteJumpPressed(this.timers, now, GAME_CONFIG.jumpBufferMs);

    if (tryConsumeJump(this.timers, now)) {
      body.setVelocityY(GAME_CONFIG.jumpVelocity);
      this.jumpCutApplied = false;
    }

    // Variable Sprunghöhe: einmalig kappen, wenn im Aufstieg losgelassen wird.
    if (!this.jumpCutApplied && !input.jumpHeld && body.velocity.y < 0) {
      body.setVelocityY(cutJumpVelocity(body.velocity.y, GAME_CONFIG.variableJumpCut));
      this.jumpCutApplied = true;
    }
    if (body.velocity.y >= 0) this.jumpCutApplied = true;

    body.setVelocityY(clampFallSpeed(body.velocity.y, GAME_CONFIG.maxFallSpeed));
  }
}
