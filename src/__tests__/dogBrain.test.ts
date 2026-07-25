import { describe, expect, it } from 'vitest';
import {
  createDogBrain,
  moodInput,
  pickSpot,
  recallChance,
  spotInterest,
  updateDogBrain,
  type DogBrainConfig,
  type DogBrainContext,
  type Rng,
  type SniffSpot,
} from '../core/dogBrain';
import { playerLeashResponse, type LeashConfig } from '../core/leash';

const BRAIN_CFG: DogBrainConfig = {
  sniffMs: [700, 1800],
  wanderMs: [500, 1200],
  followMs: [900, 2000],
  sniffChance: 0.45,
  leashHeel: 0.85,
  spotChance: 0.55,
  spotSearchRadius: 230,
  spotInterestRadius: 190,
  giveUpInterest: 0.12,
  arriveDistance: 20,
  lingerMs: [800, 2000],
  spotCooldownMs: 7000,
  recallStartRatio: 0.45,
  recallMaxPerSec: 3.5,
  trotAhead: 46,
  // Zufallsverhalten in den Basis-Tests deaktiviert, damit die Würfelfolgen
  // vorhersagbar bleiben; eigene Tests unten schalten es gezielt ein.
  shakeChance: 0,
  shakeMs: [420, 700],
  zoomiesChance: 0,
  zoomiesMs: [700, 1400],
  zoomiesSpeed: 1.5,
  sitAfterIdleMs: 2200,
  sitChance: 0,
};

/** Liefert die vorgegebenen Werte der Reihe nach, dann konstant den letzten. */
const seq = (...values: number[]): Rng => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)]!;
};

const ctx = (over: Partial<DogBrainContext> = {}): DogBrainContext => ({
  dogX: 100,
  dogY: 650,
  playerX: 140,
  playerY: 650,
  distanceToPlayer: 40,
  leashLength: 130,
  spots: [],
  playerIdleMs: 0,
  ...over,
});

describe('updateDogBrain — Grundverhalten', () => {
  it('erzwingt "follow", sobald die Leine straff zu werden droht', () => {
    const brain = createDogBrain();
    brain.mood = 'sniff';
    brain.timerMs = 5000;
    // 120 >= 130 * 0.85 = 110.5 → bei Fuß
    updateDogBrain(brain, 16, ctx({ distanceToPlayer: 120 }), BRAIN_CFG, seq(0.1));
    expect(brain.mood).toBe('follow');
    expect(brain.timerMs).toBe(0);
  });

  it('bleibt bei kurzer Leine in der aktuellen Stimmung, bis der Timer abläuft', () => {
    const brain = createDogBrain();
    brain.mood = 'sniff';
    brain.timerMs = 500;
    updateDogBrain(brain, 100, ctx(), BRAIN_CFG, seq(0.1));
    expect(brain.mood).toBe('sniff');
    expect(brain.timerMs).toBe(400);
  });

  it('wechselt ohne Stellen in Reichweite ins Schnüffeln', () => {
    const brain = createDogBrain();
    // Würfelfolge: schütteln nein, zoomies nein, Stelle nein, schnüffeln ja
    updateDogBrain(brain, 16, ctx(), BRAIN_CFG, seq(0.9, 0.9, 0.9, 0.2));
    expect(brain.mood).toBe('sniff');
  });

  it('kehrt nach Schnüffeln/Streunen wieder zu "follow" zurück', () => {
    const brain = createDogBrain();
    brain.mood = 'wander';
    brain.timerMs = 10;
    updateDogBrain(brain, 16, ctx(), BRAIN_CFG, seq(0.5));
    expect(brain.mood).toBe('follow');
  });
});

describe('spotInterest — quadratischer Abfall', () => {
  it('ist an der Stelle maximal und am Rand 0', () => {
    expect(spotInterest(0, 190)).toBe(1);
    expect(spotInterest(190, 190)).toBe(0);
    expect(spotInterest(400, 190)).toBe(0);
  });

  it('fällt quadratisch, nicht linear', () => {
    // Auf halber Strecke wäre linear 0.5 — quadratisch sind es 0.25
    expect(spotInterest(95, 190)).toBeCloseTo(0.25);
    // Bei einem Viertel: (1-0.25)² = 0.5625
    expect(spotInterest(47.5, 190)).toBeCloseTo(0.5625);
  });

  it('halbiert sich schneller als der Abstand wächst', () => {
    const near = spotInterest(40, 190);
    const mid = spotInterest(80, 190);
    const far = spotInterest(120, 190);
    expect(near - mid).toBeGreaterThan(mid - far);
  });
});

const SPOTS: SniffSpot[] = [
  { x: 140, y: 650, appeal: 1, markable: true }, // 40px entfernt
  { x: 600, y: 650, appeal: 1, markable: false }, // weit weg
];

describe('pickSpot', () => {
  it('wählt eine Stelle in Reichweite', () => {
    const brain = createDogBrain();
    expect(pickSpot(100, 650, SPOTS, brain, BRAIN_CFG, seq(0.5))).toBe(0);
  });

  it('ignoriert Stellen außerhalb des Suchradius', () => {
    const brain = createDogBrain();
    const farOnly: SniffSpot[] = [{ x: 900, y: 650, appeal: 1, markable: true }];
    expect(pickSpot(100, 650, farOnly, brain, BRAIN_CFG, seq(0.5))).toBe(-1);
  });

  it('überspringt Stellen mit laufender Sperrzeit', () => {
    const brain = createDogBrain();
    brain.cooldowns.set(0, 5000);
    expect(pickSpot(100, 650, [SPOTS[0]!], brain, BRAIN_CFG, seq(0.5))).toBe(-1);
  });

  it('liefert -1, wenn es gar keine Stellen gibt', () => {
    expect(pickSpot(100, 650, [], createDogBrain(), BRAIN_CFG, seq(0.5))).toBe(-1);
  });
});

describe('Schnüffelstellen ansteuern und verlieren', () => {
  it('steuert bei passendem Würfel eine Stelle an', () => {
    const brain = createDogBrain();
    updateDogBrain(brain, 16, ctx({ spots: SPOTS }), BRAIN_CFG, seq(0.1, 0.5));
    expect(brain.mood).toBe('spot');
    expect(brain.targetSpot).toBe(0);
    expect(brain.lingering).toBe(false);
  });

  it('verweilt, sobald er angekommen ist', () => {
    const brain = createDogBrain();
    brain.mood = 'spot';
    brain.targetSpot = 0;
    // Hund steht direkt an der Stelle (140,650)
    updateDogBrain(brain, 16, ctx({ dogX: 140, spots: SPOTS }), BRAIN_CFG, seq(0.9, 0.5));
    expect(brain.lingering).toBe(true);
    expect(brain.timerMs).toBeGreaterThan(0);
  });

  it('gibt die Stelle auf, wenn der Mensch ihn weit genug wegzieht', () => {
    const brain = createDogBrain();
    brain.mood = 'spot';
    brain.targetSpot = 0;
    // 180px entfernt → Interesse (1-180/190)² ≈ 0.003 < giveUpInterest
    updateDogBrain(brain, 16, ctx({ dogX: -40, spots: SPOTS }), BRAIN_CFG, seq(0.5));
    expect(brain.mood).toBe('follow');
    expect(brain.targetSpot).toBe(-1);
  });

  it('sperrt eine aufgegebene Stelle, damit er nicht sofort umkehrt', () => {
    const brain = createDogBrain();
    brain.mood = 'spot';
    brain.targetSpot = 0;
    updateDogBrain(brain, 16, ctx({ dogX: -40, spots: SPOTS }), BRAIN_CFG, seq(0.5));
    expect(brain.cooldowns.get(0)).toBe(BRAIN_CFG.spotCooldownMs);
  });

  it('lässt die Sperrzeit mit der Zeit ablaufen', () => {
    const brain = createDogBrain();
    brain.cooldowns.set(0, 100);
    updateDogBrain(brain, 60, ctx(), BRAIN_CFG, seq(0.9, 0.9));
    expect(brain.cooldowns.get(0)).toBe(40);
    updateDogBrain(brain, 60, ctx(), BRAIN_CFG, seq(0.9, 0.9));
    expect(brain.cooldowns.has(0)).toBe(false);
  });

  it('straffe Leine schlägt jedes Schnüffel-Interesse', () => {
    const brain = createDogBrain();
    brain.mood = 'spot';
    brain.targetSpot = 0;
    brain.lingering = true;
    updateDogBrain(
      brain,
      16,
      ctx({ dogX: 140, distanceToPlayer: 125, spots: SPOTS }),
      BRAIN_CFG,
      seq(0.5),
    );
    expect(brain.mood).toBe('follow');
    expect(brain.lingering).toBe(false);
  });

  it('markiert nur an markierbaren Stellen', () => {
    const brain = createDogBrain();
    brain.mood = 'spot';
    brain.targetSpot = 1; // markable: false
    const spots: SniffSpot[] = [SPOTS[0]!, { x: 140, y: 650, appeal: 1, markable: false }];
    updateDogBrain(brain, 16, ctx({ dogX: 140, spots }), BRAIN_CFG, seq(0.1, 0.5));
    expect(brain.lingering).toBe(true);
    expect(brain.marking).toBe(false);
  });
});

describe('recallChance — je weiter weg, desto eher kommt er zurück', () => {
  it('ist bei kurzer Leine null', () => {
    expect(recallChance(0, 130, BRAIN_CFG)).toBe(0);
    // 45% der Leinenlänge ist die Schwelle
    expect(recallChance(58, 130, BRAIN_CFG)).toBe(0);
  });

  it('steigt mit dem Abstand monoton an', () => {
    const a = recallChance(80, 130, BRAIN_CFG);
    const b = recallChance(100, 130, BRAIN_CFG);
    const c = recallChance(120, 130, BRAIN_CFG);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it('erreicht am Leinenende das Maximum', () => {
    expect(recallChance(130, 130, BRAIN_CFG)).toBeCloseTo(BRAIN_CFG.recallMaxPerSec);
  });

  it('wächst überproportional, nicht linear', () => {
    // Auf halber Strecke zwischen Schwelle und Ende: (0.5)² = 25% des Maximums
    const mid = recallChance(58.5 + (130 - 58.5) / 2, 130, BRAIN_CFG);
    expect(mid).toBeCloseTo(BRAIN_CFG.recallMaxPerSec * 0.25, 1);
  });

  it('holt den Hund von einer Stelle zurück, wenn der Wurf zieht', () => {
    const brain = createDogBrain();
    brain.mood = 'spot';
    brain.targetSpot = 0;
    // Distanz 110 → Rückrufdruck deutlich > 0; rng 0 erzwingt das Umkehren
    updateDogBrain(
      brain,
      100,
      ctx({ distanceToPlayer: 110, spots: SPOTS }),
      BRAIN_CFG,
      seq(0),
    );
    expect(brain.mood).toBe('follow');
    expect(brain.targetSpot).toBe(-1);
  });

  it('lässt ihn bei kurzer Leine in Ruhe schnüffeln', () => {
    const brain = createDogBrain();
    brain.mood = 'sniff';
    brain.timerMs = 900;
    updateDogBrain(brain, 100, ctx({ distanceToPlayer: 30 }), BRAIN_CFG, seq(0));
    expect(brain.mood).toBe('sniff');
  });
});

describe('typisches Hundeverhalten', () => {
  it('schüttelt sich gelegentlich', () => {
    const brain = createDogBrain();
    const cfg = { ...BRAIN_CFG, shakeChance: 1 };
    updateDogBrain(brain, 16, ctx(), cfg, seq(0.5));
    expect(brain.mood).toBe('shake');
    expect(brain.timerMs).toBeGreaterThanOrEqual(cfg.shakeMs[0]);
  });

  it('setzt sich, wenn der Mensch lange genug stillsteht', () => {
    const brain = createDogBrain();
    const cfg = { ...BRAIN_CFG, sitChance: 1 };
    updateDogBrain(brain, 16, ctx({ playerIdleMs: 3000 }), cfg, seq(0.9, 0.5));
    expect(brain.mood).toBe('sit');
  });

  it('setzt sich nicht, solange der Mensch unterwegs ist', () => {
    const brain = createDogBrain();
    const cfg = { ...BRAIN_CFG, sitChance: 1 };
    updateDogBrain(brain, 16, ctx({ playerIdleMs: 0 }), cfg, seq(0.9, 0.5));
    expect(brain.mood).not.toBe('sit');
  });

  it('steht wieder auf, sobald der Mensch weitergeht', () => {
    const brain = createDogBrain();
    brain.mood = 'sit';
    brain.timerMs = 5000;
    updateDogBrain(brain, 16, ctx({ playerIdleMs: 0 }), BRAIN_CFG, seq(0.5));
    expect(brain.mood).toBe('follow');
  });

  it('bekommt gelegentlich Zoomies mit eigener Richtung', () => {
    const brain = createDogBrain();
    const cfg = { ...BRAIN_CFG, zoomiesChance: 1 };
    updateDogBrain(brain, 16, ctx(), cfg, seq(0.9, 0.5, 0.2));
    expect(brain.mood).toBe('zoomies');
    expect([-1, 1]).toContain(brain.wanderDir);
  });
});

describe('pickSpot berücksichtigt die Leinenreichweite', () => {
  it('ignoriert Stellen, die der Mensch gar nicht zulässt', () => {
    const brain = createDogBrain();
    // Stelle 40px rechts vom Hund, aber 300px vom Menschen entfernt
    const spots: SniffSpot[] = [{ x: 140, y: 650, appeal: 1, markable: true }];
    const index = pickSpot(100, 650, spots, brain, BRAIN_CFG, seq(0.5), {
      playerX: -200,
      playerY: 650,
      leashLength: 130,
    });
    expect(index).toBe(-1);
  });

  it('nimmt Stellen innerhalb der Leinenreichweite', () => {
    const brain = createDogBrain();
    const spots: SniffSpot[] = [{ x: 140, y: 650, appeal: 1, markable: true }];
    const index = pickSpot(100, 650, spots, brain, BRAIN_CFG, seq(0.5), {
      playerX: 120,
      playerY: 650,
      leashLength: 130,
    });
    expect(index).toBe(0);
  });
});

describe('moodInput', () => {
  it('steht beim Schnüffeln, Schütteln und Sitzen still', () => {
    const brain = createDogBrain();
    for (const mood of ['sniff', 'shake', 'sit'] as const) {
      brain.mood = mood;
      expect(moodInput(brain, 100, [], 20)).toBe(0);
    }
  });

  it('rennt bei Zoomies in die gewählte Richtung', () => {
    const brain = createDogBrain();
    brain.mood = 'zoomies';
    brain.wanderDir = 1;
    expect(moodInput(brain, 100, [], 20)).toBe(1);
  });

  it('läuft beim Streunen in die eigene Richtung', () => {
    const brain = createDogBrain();
    brain.mood = 'wander';
    brain.wanderDir = -1;
    expect(moodInput(brain, 100, [], 20)).toBe(-1);
  });

  it('läuft zur Zielstelle und bleibt dort stehen', () => {
    const brain = createDogBrain();
    brain.mood = 'spot';
    brain.targetSpot = 0;
    expect(moodInput(brain, 100, SPOTS, 20)).toBe(1); // Stelle liegt rechts
    expect(moodInput(brain, 200, SPOTS, 20)).toBe(-1); // jetzt links
    expect(moodInput(brain, 135, SPOTS, 20)).toBe(0); // angekommen
  });

  it('bleibt beim Verweilen stehen', () => {
    const brain = createDogBrain();
    brain.mood = 'spot';
    brain.targetSpot = 0;
    brain.lingering = true;
    expect(moodInput(brain, 0, SPOTS, 20)).toBe(0);
  });

  it('delegiert bei "follow" an den Aufrufer (null)', () => {
    expect(moodInput(createDogBrain(), 100, [], 20)).toBeNull();
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
