/**
 * Pure platformer movement helpers.
 *
 * These functions contain NO Phaser dependency so the tricky, feel-defining
 * bits — coyote time, jump buffering, acceleration/friction, variable jump —
 * can be unit-tested deterministically. `Player` wires them to an Arcade body.
 *
 * Time is passed explicitly: `dtMs` (delta in milliseconds) for the assist
 * timers, `dtSec` (delta in seconds) for the physics-style integration.
 */

/** The subset of tunables the movement math needs. */
export interface MovementConfig {
  moveAccel: number;
  airAccel: number;
  groundFriction: number;
  airFriction: number;
  maxSpeed: number;
  jumpVelocity: number;
  variableJumpCut: number;
  coyoteMs: number;
  jumpBufferMs: number;
}

const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

/**
 * Coyote timer: refilled to `coyoteMs` while grounded, otherwise counting down.
 * A positive value means a jump is still allowed shortly after leaving a ledge.
 */
export function updateCoyote(
  timer: number,
  grounded: boolean,
  coyoteMs: number,
  dtMs: number,
): number {
  if (grounded) return coyoteMs;
  return Math.max(0, timer - dtMs);
}

/**
 * Jump-buffer timer: refilled to `jumpBufferMs` on a fresh jump press, otherwise
 * counting down. A positive value means a recent press is still "remembered".
 */
export function updateJumpBuffer(
  timer: number,
  jumpPressed: boolean,
  jumpBufferMs: number,
  dtMs: number,
): number {
  if (jumpPressed) return jumpBufferMs;
  return Math.max(0, timer - dtMs);
}

/** A jump fires when a buffered press coincides with an open coyote window. */
export function canJump(coyoteTimer: number, jumpBufferTimer: number): boolean {
  return coyoteTimer > 0 && jumpBufferTimer > 0;
}

/**
 * Integrate horizontal velocity for one step: accelerate toward `maxSpeed` in
 * the input direction, or apply friction toward 0 when there is no input.
 * Never overshoots 0 (no jitter) and always clamps to ±maxSpeed.
 */
export function computeHorizontalVelocity(
  vx: number,
  moveDir: -1 | 0 | 1,
  grounded: boolean,
  cfg: MovementConfig,
  dtSec: number,
): number {
  if (moveDir !== 0) {
    const accel = grounded ? cfg.moveAccel : cfg.airAccel;
    return clamp(vx + moveDir * accel * dtSec, -cfg.maxSpeed, cfg.maxSpeed);
  }
  const friction = grounded ? cfg.groundFriction : cfg.airFriction;
  const drop = friction * dtSec;
  if (Math.abs(vx) <= drop) return 0;
  return vx - Math.sign(vx) * drop;
}

/** Shortened-hop velocity when the jump key is released while still rising. */
export function applyVariableJumpCut(vy: number, cfg: MovementConfig): number {
  return vy < 0 ? vy * cfg.variableJumpCut : vy;
}
