import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../config/GameConfig';
import { GOAL, TEST_LEVEL, TEST_ZONES, type PlatformDef } from '../config/testLevel';
import { maxJumpDistance, maxJumpHeight } from '../core/movement';
import { rectsOverlap } from '../core/layerMath';

/**
 * Diese Tests halten die Level-Geometrie und die Sprungphysik zusammen:
 * Ändert jemand jumpVelocity/gravityY oder verschiebt Plattformen, schlägt
 * sofort das passende Design-Versprechen fehl statt erst beim Spielen.
 */

const JUMP_H = maxJumpHeight(GAME_CONFIG.jumpVelocity, GAME_CONFIG.gravityY);
const JUMP_D = maxJumpDistance(
  GAME_CONFIG.jumpVelocity,
  GAME_CONFIG.gravityY,
  GAME_CONFIG.maxSpeed,
);

const layer = (i: number): readonly PlatformDef[] => TEST_LEVEL[i]!.platforms;
const right = (p: PlatformDef): number => p.x + p.width;

/** Kann man von Plattform `from` (Oberkante) auf `to` springen? */
function reachable(from: PlatformDef, to: PlatformDef): boolean {
  const rise = from.y - to.y; // positiv = nach oben
  if (rise > JUMP_H) return false;
  // Horizontale Lücke zwischen den nächstliegenden Kanten
  const gap = Math.max(0, Math.max(from.x - right(to), to.x - right(from)));
  return gap <= JUMP_D;
}

describe('Sprungreichweite', () => {
  it('entspricht der erwarteten Größenordnung', () => {
    expect(JUMP_H).toBeCloseTo(80.4, 0);
    expect(JUMP_D).toBeCloseTo(171.7, 0);
  });
});

describe('Aufstiegs-Treppe auf Ebene 3 ist begehbar', () => {
  const stairs = layer(2).filter((p) => p.x >= 1900);
  // Das Bodenstück, auf dem die Treppe tatsächlich steht (nach der Lücke).
  const ground = layer(2).find((p) => p.y === 672 && p.x <= 1900 && right(p) >= 1900)!;

  it('besteht aus drei Stufen', () => {
    expect(stairs).toHaveLength(3);
  });

  it('jede Stufe ist vom Vorgänger aus erreichbar', () => {
    let prev = ground;
    for (const step of stairs) {
      expect(reachable(prev, step)).toBe(true);
      prev = step;
    }
  });

  it('endet auf Höhe der Zielplattform', () => {
    const top = stairs[stairs.length - 1]!;
    const goalPlatform = layer(1).find((p) => p.y === 471 && p.x >= 2200);
    expect(goalPlatform).toBeDefined();
    expect(top.y).toBe(goalPlatform!.y);
  });
});

describe('Zone D ist der einzige Zugang zum Ziel', () => {
  const zoneD = TEST_ZONES[TEST_ZONES.length - 1]!;
  const goalPlatform = layer(1).find((p) => p.x >= 2200 && p.y === 471)!;

  it('verbindet nur Ebene 2 und 3', () => {
    expect([...zoneD.layers].sort()).toEqual([1, 2]);
  });

  it('liegt auf der obersten Treppenstufe von Ebene 3', () => {
    const top = layer(2).find((p) => p.x === 2250)!;
    const standing = { x: zoneD.rect.x, y: top.y - 40, width: 28, height: 40 };
    expect(rectsOverlap(zoneD.rect, standing)).toBe(true);
  });

  it('die Zielplattform ist von keiner Ebene-2-Plattform aus erreichbar', () => {
    const others = layer(1).filter((p) => p !== goalPlatform);
    for (const p of others) {
      expect(reachable(p, goalPlatform)).toBe(false);
    }
  });
});

describe('Ziel-Marker', () => {
  it('steht auf der Zielplattform der richtigen Ebene', () => {
    const goalPlatform = layer(GOAL.layer).find((p) => p.x >= 2200 && p.y === 471)!;
    expect(GOAL.layer).toBe(1);
    // Marker ist 56px hoch und sitzt mit der Unterkante auf der Plattform
    expect(GOAL.y + 56).toBe(goalPlatform.y);
    expect(GOAL.x).toBeGreaterThanOrEqual(goalPlatform.x);
    expect(GOAL.x + 40).toBeLessThanOrEqual(goalPlatform.x + goalPlatform.width);
  });
});

describe('Pflicht-Sprungstellen der Route', () => {
  /** Lücken zwischen den Bodenstücken einer Ebene. */
  const groundGaps = (i: number): number[] => {
    const ground = layer(i)
      .filter((p) => p.y === 672)
      .slice()
      .sort((a, b) => a.x - b.x);
    const gaps: number[] = [];
    for (let k = 1; k < ground.length; k++) {
      gaps.push(ground[k]!.x - right(ground[k - 1]!));
    }
    return gaps;
  };

  it('Ebene 1 hat zwei Bodenlücken, beide überspringbar', () => {
    const gaps = groundGaps(0);
    expect(gaps).toHaveLength(2);
    for (const gap of gaps) {
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThan(JUMP_D);
    }
  });

  it('Ebene 3 hat eine überspringbare Lücke auf dem Weg zur Treppe', () => {
    const gaps = groundGaps(2);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!).toBeLessThan(JUMP_D);
  });

  it('die Lücken sind breit genug, dass man nicht einfach hinüberläuft', () => {
    for (const gap of [...groundGaps(0), ...groundGaps(2)]) {
      expect(gap).toBeGreaterThanOrEqual(100);
    }
  });

  it('die Treppenstufen erzwingen jeweils einen Sprung', () => {
    const stairs = layer(2).filter((p) => p.x >= 1900);
    let prev = layer(2).find((p) => p.y === 672 && right(p) >= 1900)!;
    for (const step of stairs) {
      expect(prev.y - step.y).toBeGreaterThan(0); // echter Höhenunterschied
      prev = step;
    }
  });
});

describe('Hund kommt allein nicht die Treppe hoch', () => {
  it('sein Hüpfer bleibt unter der Stufenhöhe — die Leine muss ziehen', () => {
    const dogJump = maxJumpHeight(GAME_CONFIG.dog.jumpVelocity, GAME_CONFIG.gravityY);
    expect(dogJump).toBeLessThan(30);
    expect(dogJump).toBeLessThan(672 - 605); // eine Treppenstufe
  });
});

describe('Bodenlücke auf Ebene 2', () => {
  it('liegt unter der Fall-Zone bei x 1080', () => {
    const fallZone = TEST_ZONES.find((z) => z.rect.x === 1080)!;
    const groundPieces = layer(1).filter((p) => p.y === 672);
    const coversZone = groundPieces.some(
      (p) => p.x <= fallZone.rect.x && right(p) >= fallZone.rect.x + fallZone.rect.width,
    );
    expect(coversZone).toBe(false);
  });
});
