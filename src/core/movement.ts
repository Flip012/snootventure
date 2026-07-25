/**
 * Pure Movement-Logik — bewusst frei von Phaser, damit sie mit vitest
 * deterministisch testbar ist. Der Player wendet die Ergebnisse pro Frame
 * auf seinen Arcade-Body an.
 */

export interface HorizontalConfig {
  readonly moveAccel: number;
  readonly airAccel: number;
  readonly groundDrag: number;
  readonly airDrag: number;
  readonly maxSpeed: number;
}

/** -1 = links, 0 = kein Input, 1 = rechts */
export type MoveInput = -1 | 0 | 1;

/**
 * Integriert die horizontale Geschwindigkeit über dtMs Millisekunden:
 * Beschleunigung bei Input, Drag ohne Input, Clamping auf maxSpeed.
 */
export function applyHorizontal(
  vx: number,
  input: MoveInput,
  grounded: boolean,
  dtMs: number,
  cfg: HorizontalConfig,
): number {
  const dt = dtMs / 1000;
  if (input !== 0) {
    const accel = grounded ? cfg.moveAccel : cfg.airAccel;
    vx += input * accel * dt;
  } else {
    const drag = (grounded ? cfg.groundDrag : cfg.airDrag) * dt;
    if (Math.abs(vx) <= drag) {
      vx = 0;
    } else {
      vx -= Math.sign(vx) * drag;
    }
  }
  return Math.max(-cfg.maxSpeed, Math.min(cfg.maxSpeed, vx));
}

/**
 * Zeitfenster für Coyote Time und Jump Buffering.
 * Alle Zeitpunkte sind absolute Millisekunden (scene.time.now).
 */
export interface JumpTimers {
  /** Bis zu diesem Zeitpunkt gilt der Player als "noch springfähig". */
  coyoteUntil: number;
  /** Bis zu diesem Zeitpunkt bleibt ein gedrückter Sprung gepuffert. */
  bufferedUntil: number;
}

export function createJumpTimers(): JumpTimers {
  return { coyoteUntil: -Infinity, bufferedUntil: -Infinity };
}

/** Jeden Frame aufrufen, in dem der Player am Boden steht. */
export function noteGrounded(t: JumpTimers, now: number, coyoteMs: number): void {
  t.coyoteUntil = now + coyoteMs;
}

/** Aufrufen, wenn die Sprungtaste frisch gedrückt wurde (JustDown). */
export function noteJumpPressed(t: JumpTimers, now: number, jumpBufferMs: number): void {
  t.bufferedUntil = now + jumpBufferMs;
}

/**
 * Liefert true genau dann, wenn jetzt gesprungen werden darf
 * (Coyote-Fenster UND Buffer-Fenster offen) — und konsumiert beide Fenster,
 * damit ein Tastendruck nicht zwei Sprünge auslöst.
 */
export function tryConsumeJump(t: JumpTimers, now: number): boolean {
  if (now <= t.coyoteUntil && now <= t.bufferedUntil) {
    t.coyoteUntil = -Infinity;
    t.bufferedUntil = -Infinity;
    return true;
  }
  return false;
}

/**
 * Variable Sprunghöhe: Wird die Sprungtaste im Aufstieg losgelassen,
 * wird die Aufwärtsgeschwindigkeit gekappt. Im Fall (vy >= 0) passiert nichts.
 */
export function cutJumpVelocity(vy: number, variableJumpCut: number): number {
  return vy < 0 ? vy * variableJumpCut : vy;
}

/** Fallgeschwindigkeit nach unten begrenzen. */
export function clampFallSpeed(vy: number, maxFallSpeed: number): number {
  return Math.min(vy, maxFallSpeed);
}

/**
 * Maximale Steighöhe eines vollen Sprungs (px): v²/(2g).
 * Bestimmt, wie hoch Plattform-Stufen im Level sein dürfen.
 */
export function maxJumpHeight(jumpVelocity: number, gravityY: number): number {
  return (jumpVelocity * jumpVelocity) / (2 * gravityY);
}

/**
 * Maximale horizontale Sprungweite (px) bei voller Geschwindigkeit auf
 * gleicher Höhe: Flugzeit 2*|v_y|/g mal v_x.
 */
export function maxJumpDistance(
  jumpVelocity: number,
  gravityY: number,
  maxSpeed: number,
): number {
  return (maxSpeed * 2 * Math.abs(jumpVelocity)) / gravityY;
}
