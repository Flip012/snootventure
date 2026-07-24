import { describe, expect, it } from 'vitest';
import {
  applyVariableJumpCut,
  canJump,
  computeHorizontalVelocity,
  updateCoyote,
  updateJumpBuffer,
  type MovementConfig,
} from '../src/entities/movement';

const cfg: MovementConfig = {
  moveAccel: 2000,
  airAccel: 1000,
  groundFriction: 2000,
  airFriction: 500,
  maxSpeed: 200,
  jumpVelocity: -500,
  variableJumpCut: 0.5,
  coyoteMs: 100,
  jumpBufferMs: 120,
};

describe('coyote timer', () => {
  it('refills to coyoteMs while grounded', () => {
    expect(updateCoyote(0, true, 100, 16)).toBe(100);
  });

  it('counts down while airborne and never goes below 0', () => {
    expect(updateCoyote(100, false, 100, 40)).toBe(60);
    expect(updateCoyote(20, false, 100, 40)).toBe(0);
  });

  it('opens then closes the jump window after leaving a ledge', () => {
    let t = updateCoyote(0, true, 100, 16); // grounded → full
    t = updateCoyote(t, false, 100, 50); // 50ms airborne → 50 left (jump ok)
    expect(t).toBeGreaterThan(0);
    t = updateCoyote(t, false, 100, 60); // total 110ms → closed
    expect(t).toBe(0);
  });
});

describe('jump buffer timer', () => {
  it('refills on a fresh press', () => {
    expect(updateJumpBuffer(0, true, 120, 16)).toBe(120);
  });

  it('counts down without a press and floors at 0', () => {
    expect(updateJumpBuffer(120, false, 120, 40)).toBe(80);
    expect(updateJumpBuffer(30, false, 120, 40)).toBe(0);
  });

  it('a press just before landing still fires on landing', () => {
    // Press while airborne, then land 100ms later — within the 120ms buffer.
    let buffer = updateJumpBuffer(0, true, 120, 16);
    buffer = updateJumpBuffer(buffer, false, 120, 100);
    const coyoteOnLanding = updateCoyote(0, true, 100, 16); // grounded this frame
    expect(canJump(coyoteOnLanding, buffer)).toBe(true);
  });
});

describe('canJump', () => {
  it('requires both windows open', () => {
    expect(canJump(50, 50)).toBe(true);
    expect(canJump(0, 50)).toBe(false);
    expect(canJump(50, 0)).toBe(false);
    expect(canJump(0, 0)).toBe(false);
  });
});

describe('horizontal velocity', () => {
  it('accelerates toward the input direction', () => {
    const vx = computeHorizontalVelocity(0, 1, true, cfg, 0.016);
    expect(vx).toBeCloseTo(2000 * 0.016, 5);
  });

  it('clamps to maxSpeed', () => {
    const vx = computeHorizontalVelocity(190, 1, true, cfg, 1);
    expect(vx).toBe(cfg.maxSpeed);
  });

  it('uses the lower air acceleration while airborne', () => {
    const ground = computeHorizontalVelocity(0, 1, true, cfg, 0.1);
    const air = computeHorizontalVelocity(0, 1, false, cfg, 0.1);
    expect(air).toBeLessThan(ground);
  });

  it('applies friction toward zero without overshooting sign', () => {
    const vx = computeHorizontalVelocity(10, 0, true, cfg, 1); // huge drop
    expect(vx).toBe(0);
  });

  it('decelerates gradually with a small step', () => {
    const vx = computeHorizontalVelocity(200, 0, true, cfg, 0.016);
    expect(vx).toBeCloseTo(200 - 2000 * 0.016, 5);
    expect(vx).toBeGreaterThan(0);
  });
});

describe('variable jump cut', () => {
  it('shortens an upward jump', () => {
    expect(applyVariableJumpCut(-400, cfg)).toBe(-200);
  });

  it('leaves a downward velocity untouched', () => {
    expect(applyVariableJumpCut(300, cfg)).toBe(300);
  });
});
