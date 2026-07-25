/**
 * Eigenständiges Hundeverhalten — pure Zustandsmaschine, damit sie ohne
 * Phaser testbar ist. Der Hund folgt nicht stur, sondern bleibt zwischendurch
 * stehen (schnüffeln) oder trottet in eine eigene Richtung (streunen). Weil
 * die Leine ein Feder-Constraint ist, zieht ein streunender Hund den Menschen
 * spürbar mit — genau das ist der gewünschte Effekt.
 */

export type DogMood = 'follow' | 'sniff' | 'wander';

export interface DogBrainConfig {
  readonly sniffMs: readonly [number, number];
  readonly wanderMs: readonly [number, number];
  readonly followMs: readonly [number, number];
  readonly sniffChance: number;
  /** Ab diesem Anteil der Leinenlänge übernimmt "bei Fuß". */
  readonly leashHeel: number;
}

export interface DogBrain {
  mood: DogMood;
  /** Restdauer der aktuellen Stimmung in ms. */
  timerMs: number;
  /** Laufrichtung beim Streunen. */
  wanderDir: -1 | 1;
}

/** Zufallszahl in [0,1) — injizierbar, damit Tests deterministisch bleiben. */
export type Rng = () => number;

const pick = (range: readonly [number, number], rng: Rng): number =>
  range[0] + rng() * (range[1] - range[0]);

export function createDogBrain(): DogBrain {
  return { mood: 'follow', timerMs: 0, wanderDir: 1 };
}

/**
 * Schreibt die nächste Stimmung in `brain`. Straffe Leine oder ein zu weit
 * entfernter Mensch erzwingen sofort 'follow' — der Hund lässt sich vom
 * Halsband überzeugen, egal wie spannend der Boden riecht.
 */
export function updateDogBrain(
  brain: DogBrain,
  dtMs: number,
  distance: number,
  leashLength: number,
  cfg: DogBrainConfig,
  rng: Rng,
): DogBrain {
  if (distance >= leashLength * cfg.leashHeel) {
    brain.mood = 'follow';
    brain.timerMs = 0;
    return brain;
  }

  brain.timerMs -= dtMs;
  if (brain.timerMs > 0) return brain;

  if (brain.mood === 'follow') {
    if (rng() < cfg.sniffChance) {
      brain.mood = 'sniff';
      brain.timerMs = pick(cfg.sniffMs, rng);
    } else {
      brain.mood = 'wander';
      brain.timerMs = pick(cfg.wanderMs, rng);
      brain.wanderDir = rng() < 0.5 ? -1 : 1;
    }
  } else {
    brain.mood = 'follow';
    brain.timerMs = pick(cfg.followMs, rng);
  }
  return brain;
}

/**
 * Laufrichtung aus der Stimmung. 'follow' delegiert an den Aufrufer
 * (dogFollowInput), 'sniff' steht still, 'wander' zieht eigenwillig los.
 */
export function moodInput(brain: DogBrain): -1 | 0 | 1 | null {
  switch (brain.mood) {
    case 'sniff':
      return 0;
    case 'wander':
      return brain.wanderDir;
    case 'follow':
      return null;
  }
}
