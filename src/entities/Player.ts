import type Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import { Entity } from '../core/Entity';
import type { InputSample } from '../core/input';
import { playerLeashResponse } from '../core/leash';
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
  /** Zeitstempel des letzten update() — nur fürs Debug-Overlay. */
  private lastNow = 0;

  /** Verbleibende Coyote Time in ms (Debug-Overlay). */
  debugCoyoteLeftMs(): number {
    return Math.max(0, this.timers.coyoteUntil - this.lastNow);
  }

  /** Verbleibendes Jump-Buffer-Fenster in ms (Debug-Overlay). */
  debugBufferLeftMs(): number {
    return Math.max(0, this.timers.bufferedUntil - this.lastNow);
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    this.body().setSize(GAME_CONFIG.playerWidth, GAME_CONFIG.playerHeight);
  }

  isGrounded(): boolean {
    const body = this.body();
    return body.blocked.down || body.touching.down;
  }

  update(now: number, dtMs: number, input: InputSample, extraAccel?: { x: number; y: number }): void {
    const body = this.body();
    const grounded = this.isGrounded();
    this.lastNow = now;

    // Leinenzug: Wer sich gegen den ziehenden Hund stemmt, kommt langsamer
    // voran; wer mitgeht (oder nichts drückt), wird mitgezogen.
    const leash = extraAccel
      ? playerLeashResponse(input.move, extraAccel.x, GAME_CONFIG.leash)
      : { accelX: 0, speedFactor: 1 };

    // Horizontal: Geschwindigkeit rein aus der puren Logik, deterministisch.
    body.setVelocityX(
      applyHorizontal(body.velocity.x, input.move, grounded, dtMs, {
        ...GAME_CONFIG,
        maxSpeed: GAME_CONFIG.maxSpeed * leash.speedFactor,
      }),
    );

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

    // Der Hund zieht spürbar (horizontal gedämpft je nach Gegenwehr,
    // vertikal ungedämpft — Gewicht am Seil ist Gewicht am Seil).
    if (extraAccel) {
      const dt = dtMs / 1000;
      body.setVelocityX(body.velocity.x + leash.accelX * dt);
      body.setVelocityY(body.velocity.y + extraAccel.y * dt);
    }

    body.setVelocityY(clampFallSpeed(body.velocity.y, GAME_CONFIG.maxFallSpeed));

    // Blickrichtung am Display spiegeln (Carrier bleibt unsichtbar).
    if (input.move !== 0) this.display.setFlipX(input.move < 0);
  }
}
