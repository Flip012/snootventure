/**
 * Eigenständiges Hundeverhalten — pure Zustandsmaschine, damit sie ohne
 * Phaser testbar ist. Der Hund folgt nicht stur, sondern bleibt zwischendurch
 * stehen (schnüffeln), trottet in eine eigene Richtung (streunen) oder steuert
 * gezielt eine interessante Stelle an (Busch, Strauch, Laternenpfahl …).
 *
 * Damit das den Spielfluss nicht bremst, **fällt sein Interesse quadratisch
 * mit dem Abstand zur Stelle** (`spotInterest`): Geht der Mensch einfach
 * weiter und zieht ihn weg, verliert der Hund schnell die Lust und trabt mit.
 */

export type DogMood = 'follow' | 'sniff' | 'wander' | 'spot' | 'shake' | 'sit' | 'zoomies';

/** Interessante Stelle in kanonischen Koordinaten. */
export interface SniffSpot {
  readonly x: number;
  readonly y: number;
  /** Grundattraktivität 0..1 — ein Busch lockt mehr als ein Grasbüschel. */
  readonly appeal: number;
  /** Ob der Hund hier auch markiert (Bein heben) oder nur schnüffelt. */
  readonly markable: boolean;
}

export interface DogBrainConfig {
  readonly sniffMs: readonly [number, number];
  readonly wanderMs: readonly [number, number];
  readonly followMs: readonly [number, number];
  readonly sniffChance: number;
  /** Ab diesem Anteil der Leinenlänge übernimmt "bei Fuß". */
  readonly leashHeel: number;
  /** Anteil der Neuorientierungen, die zu einer Stelle führen. */
  readonly spotChance: number;
  /** Suchradius für interessante Stellen (kanonische px). */
  readonly spotSearchRadius: number;
  /** Radius, über den das Interesse quadratisch auf 0 fällt. */
  readonly spotInterestRadius: number;
  /** Darunter gibt der Hund die Stelle auf. */
  readonly giveUpInterest: number;
  /** Ab hier gilt die Stelle als erreicht. */
  readonly arriveDistance: number;
  readonly lingerMs: readonly [number, number];
  /** Nach dem Verlassen ist die Stelle so lange uninteressant. */
  readonly spotCooldownMs: number;

  // --- Rückruf: je weiter weg, desto eher kommt er von selbst zurück ---
  /** Ab diesem Anteil der Leinenlänge beginnt der Drang zurückzukommen. */
  readonly recallStartRatio: number;
  /** Rückkehr-Wahrscheinlichkeit pro Sekunde am Ende der Leine. */
  readonly recallMaxPerSec: number;

  // --- Typisches Hundeverhalten ---
  /** Wie weit vor dem Menschen er trabt, wenn der zügig geht. */
  readonly trotAhead: number;
  readonly shakeChance: number;
  readonly shakeMs: readonly [number, number];
  readonly zoomiesChance: number;
  readonly zoomiesMs: readonly [number, number];
  /** Tempo-Faktor während der Zoomies. */
  readonly zoomiesSpeed: number;
  /** Steht der Mensch so lange still, setzt sich der Hund. */
  readonly sitAfterIdleMs: number;
  readonly sitChance: number;
}

export interface DogBrain {
  mood: DogMood;
  /** Restdauer der aktuellen Stimmung in ms. */
  timerMs: number;
  /** Laufrichtung beim Streunen. */
  wanderDir: -1 | 1;
  /** Index der angesteuerten Stelle, oder -1. */
  targetSpot: number;
  /** true, sobald er an der Stelle angekommen ist und dort verweilt. */
  lingering: boolean;
  /** true, wenn er dort gerade markiert (nur an markable-Stellen). */
  marking: boolean;
  /** Restliche Sperrzeit pro Stellen-Index. */
  cooldowns: Map<number, number>;
}

/** Zufallszahl in [0,1) — injizierbar, damit Tests deterministisch bleiben. */
export type Rng = () => number;

const pick = (range: readonly [number, number], rng: Rng): number =>
  range[0] + rng() * (range[1] - range[0]);

export function createDogBrain(): DogBrain {
  return {
    mood: 'follow',
    timerMs: 0,
    wanderDir: 1,
    targetSpot: -1,
    lingering: false,
    marking: false,
    cooldowns: new Map(),
  };
}

/**
 * Interesse an einer Stelle im Abstand `distance`: fällt **quadratisch** auf 0
 * am Rand von `radius`. Genau dieser Abfall sorgt dafür, dass ein
 * weitergehender Mensch den Hund schnell "entzaubert".
 */
export function spotInterest(distance: number, radius: number): number {
  if (radius <= 0) return 0;
  const t = Math.max(0, 1 - distance / radius);
  return t * t;
}

/**
 * Drang, von selbst zum Menschen zurückzukommen — als Wahrscheinlichkeit pro
 * Sekunde. Bis `recallStartRatio` der Leinenlänge ist der Hund entspannt; ab
 * dort steigt der Drang quadratisch, bis er am Leinenende praktisch sicher
 * umkehrt. So endet die Leine nicht abrupt, sondern der Hund merkt selbst,
 * dass er zu weit weg ist.
 */
export function recallChance(
  distance: number,
  leashLength: number,
  cfg: DogBrainConfig,
): number {
  if (leashLength <= 0) return cfg.recallMaxPerSec;
  const ratio = distance / leashLength;
  if (ratio <= cfg.recallStartRatio) return 0;
  const t = Math.min(1, (ratio - cfg.recallStartRatio) / (1 - cfg.recallStartRatio));
  return cfg.recallMaxPerSec * t * t;
}

/** Abstand Hund → Stelle. */
const distTo = (spot: SniffSpot, dogX: number, dogY: number): number =>
  Math.hypot(spot.x - dogX, spot.y - dogY);

/**
 * Wählt eine Stelle in Reichweite, gewichtet nach Attraktivität und Nähe.
 * Stellen mit laufender Sperrzeit werden übersprungen. -1 = keine gefunden.
 */
export function pickSpot(
  dogX: number,
  dogY: number,
  spots: readonly SniffSpot[],
  brain: DogBrain,
  cfg: DogBrainConfig,
  rng: Rng,
  reach?: { playerX: number; playerY: number; leashLength: number },
): number {
  const weights: { index: number; weight: number }[] = [];
  let total = 0;

  for (let i = 0; i < spots.length; i++) {
    if ((brain.cooldowns.get(i) ?? 0) > 0) continue;
    const spot = spots[i]!;
    const d = distTo(spot, dogX, dogY);
    if (d > cfg.spotSearchRadius) continue;
    // Stellen jenseits der Leine gar nicht erst ins Auge fassen — sonst zerrt
    // er nur sinnlos am Halsband.
    if (reach) {
      const fromPlayer = Math.hypot(spot.x - reach.playerX, spot.y - reach.playerY);
      if (fromPlayer > reach.leashLength * cfg.leashHeel) continue;
    }
    const weight = spot.appeal * spotInterest(d, cfg.spotSearchRadius);
    if (weight <= 0) continue;
    weights.push({ index: i, weight });
    total += weight;
  }

  if (total <= 0) return -1;

  let roll = rng() * total;
  for (const { index, weight } of weights) {
    roll -= weight;
    if (roll <= 0) return index;
  }
  return weights[weights.length - 1]!.index;
}

/** Beendet das Interesse an der aktuellen Stelle und sperrt sie kurz. */
function abandonSpot(brain: DogBrain, cfg: DogBrainConfig): void {
  if (brain.targetSpot >= 0) {
    brain.cooldowns.set(brain.targetSpot, cfg.spotCooldownMs);
  }
  brain.targetSpot = -1;
  brain.lingering = false;
  brain.marking = false;
  brain.mood = 'follow';
  brain.timerMs = 0;
}

export interface DogBrainContext {
  readonly dogX: number;
  readonly dogY: number;
  readonly playerX: number;
  readonly playerY: number;
  /** Abstand zum Menschen (Leinendistanz). */
  readonly distanceToPlayer: number;
  readonly leashLength: number;
  /** Nur die Stellen auf der Ebene des Hundes. */
  readonly spots: readonly SniffSpot[];
  /** Wie lange der Mensch schon stillsteht (ms) — Auslöser fürs Hinsetzen. */
  readonly playerIdleMs: number;
}

/**
 * Schreibt die nächste Stimmung in `brain`. Straffe Leine erzwingt sofort
 * 'follow' — der Hund lässt sich vom Halsband überzeugen, egal wie spannend
 * der Boden riecht.
 */
export function updateDogBrain(
  brain: DogBrain,
  dtMs: number,
  ctx: DogBrainContext,
  cfg: DogBrainConfig,
  rng: Rng,
): DogBrain {
  // Sperrzeiten der zuletzt besuchten Stellen herunterzählen.
  for (const [index, left] of brain.cooldowns) {
    const next = left - dtMs;
    if (next <= 0) brain.cooldowns.delete(index);
    else brain.cooldowns.set(index, next);
  }

  // Leine wird straff → mitkommen, aktuelle Stelle aufgeben.
  if (ctx.distanceToPlayer >= ctx.leashLength * cfg.leashHeel) {
    abandonSpot(brain, cfg);
    return brain;
  }

  // Schon davor: je weiter weg, desto wahrscheinlicher kehrt er von selbst um.
  if (brain.mood !== 'follow') {
    const perSec = recallChance(ctx.distanceToPlayer, ctx.leashLength, cfg);
    if (perSec > 0 && rng() < perSec * (dtMs / 1000)) {
      abandonSpot(brain, cfg);
      brain.timerMs = pick(cfg.followMs, rng);
      return brain;
    }
  }

  // Sobald der Mensch weitergeht, steht der Hund wieder auf.
  if (brain.mood === 'sit' && ctx.playerIdleMs === 0) {
    brain.mood = 'follow';
    brain.timerMs = pick(cfg.followMs, rng);
    return brain;
  }

  if (brain.mood === 'spot') {
    const spot = ctx.spots[brain.targetSpot];
    if (!spot) {
      abandonSpot(brain, cfg);
      return brain;
    }

    // Quadratischer Interessens-Abfall: Je weiter der Mensch ihn wegzieht,
    // desto schneller ist die Stelle vergessen.
    const d = distTo(spot, ctx.dogX, ctx.dogY);
    const interest = spot.appeal * spotInterest(d, cfg.spotInterestRadius);
    if (interest < cfg.giveUpInterest) {
      abandonSpot(brain, cfg);
      return brain;
    }

    if (brain.lingering) {
      brain.timerMs -= dtMs;
      if (brain.timerMs <= 0) abandonSpot(brain, cfg);
    } else if (d <= cfg.arriveDistance) {
      brain.lingering = true;
      brain.marking = spot.markable && rng() < 0.5;
      // Je attraktiver die Stelle, desto länger die Untersuchung.
      brain.timerMs = pick(cfg.lingerMs, rng) * (0.5 + 0.5 * interest);
    }
    return brain;
  }

  brain.timerMs -= dtMs;
  if (brain.timerMs > 0) return brain;

  if (brain.mood !== 'follow') {
    brain.mood = 'follow';
    brain.timerMs = pick(cfg.followMs, rng);
    return brain;
  }

  // --- Neue Beschäftigung suchen ---

  // Kurzes Schütteln — geht immer und dauert nur einen Moment.
  if (rng() < cfg.shakeChance) {
    brain.mood = 'shake';
    brain.timerMs = pick(cfg.shakeMs, rng);
    return brain;
  }

  // Steht der Mensch länger still, setzt sich der Hund irgendwann hin.
  if (ctx.playerIdleMs >= cfg.sitAfterIdleMs && rng() < cfg.sitChance) {
    brain.mood = 'sit';
    // Sitzen bleibt er, bis der Mensch weitergeht (wird unten aufgelöst).
    brain.timerMs = pick(cfg.followMs, rng) * 2;
    return brain;
  }

  // Zoomies: seltener Übermuts-Anfall.
  if (rng() < cfg.zoomiesChance) {
    brain.mood = 'zoomies';
    brain.timerMs = pick(cfg.zoomiesMs, rng);
    brain.wanderDir = rng() < 0.5 ? -1 : 1;
    return brain;
  }

  if (rng() < cfg.spotChance) {
    const index = pickSpot(ctx.dogX, ctx.dogY, ctx.spots, brain, cfg, rng, ctx);
    if (index >= 0) {
      brain.mood = 'spot';
      brain.targetSpot = index;
      brain.lingering = false;
      brain.marking = false;
      return brain;
    }
    // Keine Stelle in Reichweite → wie bisher schnüffeln/streunen.
  }

  if (rng() < cfg.sniffChance) {
    brain.mood = 'sniff';
    brain.timerMs = pick(cfg.sniffMs, rng);
  } else {
    brain.mood = 'wander';
    brain.timerMs = pick(cfg.wanderMs, rng);
    brain.wanderDir = rng() < 0.5 ? -1 : 1;
  }
  return brain;
}

/**
 * Laufrichtung aus der Stimmung. 'follow' delegiert an den Aufrufer
 * (dogFollowInput), 'sniff' steht still, 'wander' zieht eigenwillig los,
 * 'spot' steuert die Stelle an und bleibt dort stehen.
 */
export function moodInput(
  brain: DogBrain,
  dogX: number,
  spots: readonly SniffSpot[],
  arriveDistance: number,
): -1 | 0 | 1 | null {
  switch (brain.mood) {
    case 'sniff':
    case 'shake':
    case 'sit':
      return 0;
    case 'wander':
    case 'zoomies':
      return brain.wanderDir;
    case 'spot': {
      if (brain.lingering) return 0;
      const spot = spots[brain.targetSpot];
      if (!spot) return 0;
      const dx = spot.x - dogX;
      if (Math.abs(dx) <= arriveDistance) return 0;
      return dx > 0 ? 1 : -1;
    }
    case 'follow':
      return null;
  }
}
