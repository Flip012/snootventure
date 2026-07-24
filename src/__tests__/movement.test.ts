import { describe, expect, it } from 'vitest';
import {
  applyHorizontal,
  clampFallSpeed,
  createJumpTimers,
  cutJumpVelocity,
  noteGrounded,
  noteJumpPressed,
  tryConsumeJump,
  type HorizontalConfig,
} from '../core/movement';

const H: HorizontalConfig = {
  moveAccel: 2000,
  airAccel: 1000,
  groundDrag: 3000,
  airDrag: 500,
  maxSpeed: 200,
};

describe('applyHorizontal', () => {
  it('beschleunigt am Boden mit moveAccel', () => {
    // 2000 px/s² * 0.016 s = 32 px/s
    expect(applyHorizontal(0, 1, true, 16, H)).toBeCloseTo(32);
    expect(applyHorizontal(0, -1, true, 16, H)).toBeCloseTo(-32);
  });

  it('beschleunigt in der Luft mit airAccel', () => {
    expect(applyHorizontal(0, 1, false, 16, H)).toBeCloseTo(16);
  });

  it('clampt auf maxSpeed in beide Richtungen', () => {
    expect(applyHorizontal(199, 1, true, 100, H)).toBe(200);
    expect(applyHorizontal(-199, -1, true, 100, H)).toBe(-200);
  });

  it('bremst ohne Input mit groundDrag Richtung 0, ohne Überschwingen', () => {
    // Drag 3000 * 0.016 = 48 → 100 - 48 = 52
    expect(applyHorizontal(100, 0, true, 16, H)).toBeCloseTo(52);
    // Restgeschwindigkeit kleiner als Drag → exakt 0, kein Vorzeichenwechsel
    expect(applyHorizontal(30, 0, true, 16, H)).toBe(0);
    expect(applyHorizontal(-30, 0, true, 16, H)).toBe(0);
  });

  it('bremst in der Luft schwächer (airDrag)', () => {
    // 500 * 0.016 = 8 → 100 - 8 = 92
    expect(applyHorizontal(100, 0, false, 16, H)).toBeCloseTo(92);
  });
});

describe('Coyote Time + Jump Buffering', () => {
  const COYOTE = 100;
  const BUFFER = 120;

  it('erlaubt Sprung solange beide Fenster offen sind', () => {
    const t = createJumpTimers();
    noteGrounded(t, 1000, COYOTE);
    noteJumpPressed(t, 1000, BUFFER);
    expect(tryConsumeJump(t, 1000)).toBe(true);
  });

  it('erlaubt Sprung innerhalb der Coyote Time nach Verlassen des Bodens', () => {
    const t = createJumpTimers();
    noteGrounded(t, 1000, COYOTE); // letzter Bodenkontakt bei t=1000
    noteJumpPressed(t, 1090, BUFFER); // Druck 90 ms später, in der Luft
    expect(tryConsumeJump(t, 1090)).toBe(true);
  });

  it('verweigert Sprung nach Ablauf der Coyote Time', () => {
    const t = createJumpTimers();
    noteGrounded(t, 1000, COYOTE);
    noteJumpPressed(t, 1101, BUFFER);
    expect(tryConsumeJump(t, 1101)).toBe(false);
  });

  it('puffert einen frühen Sprung-Input bis zur Landung', () => {
    const t = createJumpTimers();
    noteJumpPressed(t, 1000, BUFFER); // Druck in der Luft
    noteGrounded(t, 1110, COYOTE); // Landung 110 ms später
    expect(tryConsumeJump(t, 1110)).toBe(true);
  });

  it('verwirft einen zu alten gepufferten Input', () => {
    const t = createJumpTimers();
    noteJumpPressed(t, 1000, BUFFER);
    noteGrounded(t, 1121, COYOTE); // Landung nach Ablauf des Buffers
    expect(tryConsumeJump(t, 1121)).toBe(false);
  });

  it('konsumiert beide Fenster — ein Druck löst nur einen Sprung aus', () => {
    const t = createJumpTimers();
    noteGrounded(t, 1000, COYOTE);
    noteJumpPressed(t, 1000, BUFFER);
    expect(tryConsumeJump(t, 1000)).toBe(true);
    expect(tryConsumeJump(t, 1001)).toBe(false);
  });
});

describe('variable Sprunghöhe + Fallgeschwindigkeit', () => {
  it('kappt Aufwärtsgeschwindigkeit beim Loslassen', () => {
    expect(cutJumpVelocity(-400, 0.45)).toBeCloseTo(-180);
  });

  it('lässt Abwärtsbewegung unangetastet', () => {
    expect(cutJumpVelocity(300, 0.45)).toBe(300);
    expect(cutJumpVelocity(0, 0.45)).toBe(0);
  });

  it('begrenzt die Fallgeschwindigkeit', () => {
    expect(clampFallSpeed(900, 720)).toBe(720);
    expect(clampFallSpeed(300, 720)).toBe(300);
    expect(clampFallSpeed(-500, 720)).toBe(-500);
  });
});
