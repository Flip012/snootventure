import type Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import { Entity } from '../core/Entity';
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
 * Player auf Basis des Body/Display-Splits (Entity): unsichtbarer Carrier in
 * kanonischen Koordinaten, sichtbarer Zwilling im Layer-Container.
 */
export class Player extends Entity {
  private readonly timers = createJumpTimers();
  /** true, solange der aktuelle Aufstieg noch nicht per Loslassen gekappt wurde */
  private jumpCutApplied = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    this.body().setSize(GAME_CONFIG.playerWidth, GAME_CONFIG.playerHeight);
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

    // Blickrichtung am Display spiegeln (Carrier bleibt unsichtbar).
    if (input.move !== 0) this.display.setFlipX(input.move < 0);
  }
}
