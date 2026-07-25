import { describe, expect, it } from 'vitest';
import { dogFollowInput, leashForce, leashPoints, type LeashConfig } from '../core/leash';

const CFG: LeashConfig = {
  length: 130,
  spring: 20,
  maxAccel: 2600,
  playerTug: 0.25,
  resistDamping: 0.4,
  maxSlowdown: 0.5,
};

describe('leashForce', () => {
  it('schlaffe Leine übt keine Kraft aus', () => {
    const f = leashForce({ x: 0, y: 0 }, { x: 100, y: 0 }, CFG);
    expect(f.taut).toBe(false);
    expect(f.dog).toEqual({ x: 0, y: 0 });
    expect(f.player).toEqual({ x: 0, y: 0 });
    expect(f.distance).toBe(100);
  });

  it('genau auf Ruhelänge ist noch schlaff', () => {
    expect(leashForce({ x: 0, y: 0 }, { x: 130, y: 0 }, CFG).taut).toBe(false);
  });

  it('zieht den Hund zum Player, sobald überdehnt', () => {
    // Distanz 180 → stretch 50 → 50 * 20 = 1000 px/s² nach links (zum Player)
    const f = leashForce({ x: 0, y: 0 }, { x: 180, y: 0 }, CFG);
    expect(f.taut).toBe(true);
    expect(f.dog.x).toBeCloseTo(-1000);
    expect(f.dog.y).toBeCloseTo(0);
  });

  it('wirkt auf den Player als abgeschwächte Gegenkraft', () => {
    const f = leashForce({ x: 0, y: 0 }, { x: 180, y: 0 }, CFG);
    // Gegenrichtung, 25% der Stärke
    expect(f.player.x).toBeCloseTo(250);
    expect(Math.sign(f.player.x)).toBe(-Math.sign(f.dog.x));
  });

  it('deckelt die Zugkraft bei maxAccel', () => {
    const f = leashForce({ x: 0, y: 0 }, { x: 2000, y: 0 }, CFG);
    expect(Math.hypot(f.dog.x, f.dog.y)).toBeCloseTo(CFG.maxAccel);
  });

  it('zieht auch diagonal in Richtung des Players', () => {
    const f = leashForce({ x: 0, y: 0 }, { x: 200, y: 200 }, CFG);
    expect(f.dog.x).toBeLessThan(0);
    expect(f.dog.y).toBeLessThan(0);
  });

  it('bleibt bei identischer Position stabil (keine Division durch 0)', () => {
    const f = leashForce({ x: 50, y: 50 }, { x: 50, y: 50 }, CFG);
    expect(f.taut).toBe(false);
    expect(Number.isFinite(f.dog.x)).toBe(true);
    expect(Number.isFinite(f.dog.y)).toBe(true);
  });
});

describe('dogFollowInput', () => {
  it('steht still, solange der Hund nah genug ist', () => {
    expect(dogFollowInput(100, 150, 70)).toBe(0);
    expect(dogFollowInput(100, 50, 70)).toBe(0);
  });

  it('läuft in Richtung des Players, wenn zu weit weg', () => {
    expect(dogFollowInput(0, 200, 70)).toBe(1);
    expect(dogFollowInput(200, 0, 70)).toBe(-1);
  });
});

describe('leashPoints', () => {
  it('beginnt am Player und endet am Hund', () => {
    const pts = leashPoints({ x: 0, y: 0 }, { x: 100, y: 0 }, CFG, 26);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 100, y: 0 });
  });

  it('hängt bei schlaffer Leine in der Mitte durch', () => {
    const pts = leashPoints({ x: 0, y: 0 }, { x: 40, y: 0 }, CFG, 26, 8);
    const middle = pts[4]!;
    expect(middle.y).toBeGreaterThan(0);
  });

  it('ist bei straffer Leine gerade', () => {
    const pts = leashPoints({ x: 0, y: 0 }, { x: 200, y: 0 }, CFG, 26, 8);
    for (const p of pts) expect(p.y).toBeCloseTo(0);
  });
});
