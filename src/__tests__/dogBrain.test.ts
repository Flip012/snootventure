import { describe, expect, it } from 'vitest';
import {
  createDogBrain,
  moodInput,
  updateDogBrain,
  type DogBrainConfig,
  type Rng,
} from '../core/dogBrain';
import { playerLeashResponse, type LeashConfig } from '../core/leash';

const BRAIN_CFG: DogBrainConfig = {
  sniffMs: [700, 1800],
  wanderMs: [500, 1200],
  followMs: [900, 2000],
  sniffChance: 0.45,
  leashHeel: 0.85,
};

/** Liefert die vorgegebenen Werte der Reihe nach, dann konstant den letzten. */
const seq = (...values: number[]): Rng => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)]!;
};

describe('updateDogBrain', () => {
  it('erzwingt "follow", sobald die Leine straff zu werden droht', () => {
    const brain = createDogBrain();
    brain.mood = 'sniff';
    brain.timerMs = 5000;
    // 120 >= 130 * 0.85 = 110.5 → bei Fuß
    updateDogBrain(brain, 16, 120, 130, BRAIN_CFG, seq(0.1));
    expect(brain.mood).toBe('follow');
    expect(brain.timerMs).toBe(0);
  });

  it('bleibt bei kurzer Leine in der aktuellen Stimmung, bis der Timer abläuft', () => {
    const brain = createDogBrain();
    brain.mood = 'sniff';
    brain.timerMs = 500;
    updateDogBrain(brain, 100, 40, 130, BRAIN_CFG, seq(0.1));
    expect(brain.mood).toBe('sniff');
    expect(brain.timerMs).toBe(400);
  });

  it('wechselt von "follow" ins Schnüffeln, wenn der Würfel unter sniffChance liegt', () => {
    const brain = createDogBrain();
    updateDogBrain(brain, 16, 40, 130, BRAIN_CFG, seq(0.2, 0.5));
    expect(brain.mood).toBe('sniff');
    expect(brain.timerMs).toBeGreaterThanOrEqual(700);
    expect(brain.timerMs).toBeLessThanOrEqual(1800);
  });

  it('wechselt sonst ins Streunen und wählt eine Richtung', () => {
    const brain = createDogBrain();
    updateDogBrain(brain, 16, 40, 130, BRAIN_CFG, seq(0.9, 0.5, 0.2));
    expect(brain.mood).toBe('wander');
    expect(brain.wanderDir).toBe(-1); // rng 0.2 < 0.5
    expect(brain.timerMs).toBeGreaterThanOrEqual(500);
  });

  it('kehrt nach Schnüffeln/Streunen wieder zu "follow" zurück', () => {
    const brain = createDogBrain();
    brain.mood = 'wander';
    brain.timerMs = 10;
    updateDogBrain(brain, 16, 40, 130, BRAIN_CFG, seq(0.5));
    expect(brain.mood).toBe('follow');
  });
});

describe('moodInput', () => {
  it('steht beim Schnüffeln still', () => {
    const brain = createDogBrain();
    brain.mood = 'sniff';
    expect(moodInput(brain)).toBe(0);
  });

  it('läuft beim Streunen in die eigene Richtung', () => {
    const brain = createDogBrain();
    brain.mood = 'wander';
    brain.wanderDir = -1;
    expect(moodInput(brain)).toBe(-1);
  });

  it('delegiert bei "follow" an den Aufrufer (null)', () => {
    expect(moodInput(createDogBrain())).toBeNull();
  });
});

const LEASH: LeashConfig = {
  length: 130,
  spring: 20,
  maxAccel: 2600,
  playerTug: 0.32,
  resistDamping: 0.4,
  maxSlowdown: 0.5,
};

describe('playerLeashResponse', () => {
  it('zieht den stehenden Menschen ungebremst mit', () => {
    const r = playerLeashResponse(0, 400, LEASH);
    expect(r.accelX).toBe(400);
    expect(r.speedFactor).toBe(1);
  });

  it('hilft, wenn Mensch und Hund in dieselbe Richtung wollen', () => {
    const r = playerLeashResponse(1, 400, LEASH);
    expect(r.accelX).toBe(400);
    expect(r.speedFactor).toBe(1);
  });

  it('dämpft den Zug und bremst, wenn der Mensch dagegenhält', () => {
    const r = playerLeashResponse(-1, 400, LEASH);
    expect(r.accelX).toBeCloseTo(160); // 400 * 0.4
    expect(r.speedFactor).toBeLessThan(1);
    expect(r.speedFactor).toBeGreaterThan(0.5);
  });

  it('bremst bei maximalem Zug um höchstens maxSlowdown', () => {
    const maxPull = LEASH.maxAccel * LEASH.playerTug;
    const r = playerLeashResponse(-1, maxPull, LEASH);
    expect(r.speedFactor).toBeCloseTo(0.5);
  });

  it('lässt den Menschen ohne Zug unbehelligt', () => {
    const r = playerLeashResponse(-1, 0, LEASH);
    expect(r.accelX).toBe(0);
    expect(r.speedFactor).toBe(1);
  });
});
