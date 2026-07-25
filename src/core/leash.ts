/**
 * Pure Leinen- und Hunde-Logik — frei von Phaser, deterministisch testbar.
 *
 * Modell: Die Leine ist ein einseitiger Feder-Constraint. Unterhalb der
 * Ruhelänge ist sie schlaff und übt keine Kraft aus; darüber zieht sie beide
 * Enden zueinander — den Hund stark, den Player nur mit einem Bruchteil
 * (playerTug), damit sich die Steuerung nicht schwammig anfühlt.
 */

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface LeashConfig {
  readonly length: number;
  readonly spring: number;
  readonly maxAccel: number;
  readonly playerTug: number;
  readonly resistDamping: number;
  readonly maxSlowdown: number;
}

export interface LeashForce {
  /** Beschleunigung auf den Hund (px/s²), zeigt zum Player. */
  dog: Vec2;
  /** Gegenkraft auf den Player (px/s²), zeigt zum Hund. */
  player: Vec2;
  /** true, wenn die Leine straff ist (Distanz > Ruhelänge). */
  taut: boolean;
  /** Aktuelle Distanz zwischen den Enden. */
  distance: number;
}

const ZERO: LeashForce = {
  dog: { x: 0, y: 0 },
  player: { x: 0, y: 0 },
  taut: false,
  distance: 0,
};

/**
 * Federkraft der Leine. Zieht nur, wenn sie überdehnt ist (einseitiger
 * Constraint — eine schlaffe Leine schiebt nicht).
 */
export function leashForce(player: Vec2, dog: Vec2, cfg: LeashConfig): LeashForce {
  const dx = player.x - dog.x;
  const dy = player.y - dog.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= cfg.length || dist === 0) {
    return { ...ZERO, distance: dist };
  }

  const stretch = dist - cfg.length;
  const magnitude = Math.min(cfg.maxAccel, stretch * cfg.spring);
  const nx = dx / dist;
  const ny = dy / dist;

  return {
    dog: { x: nx * magnitude, y: ny * magnitude },
    player: { x: -nx * magnitude * cfg.playerTug, y: -ny * magnitude * cfg.playerTug },
    taut: true,
    distance: dist,
  };
}

/**
 * Laufrichtung des Hundes: Er hält Abstand `followDistance` zum Player und
 * bleibt stehen, wenn er nah genug ist (kein nervöses Zittern am Ziel).
 * Straffe Leine überstimmt das — dann zieht die Feder ohnehin.
 */
export function dogFollowInput(
  dogX: number,
  playerX: number,
  followDistance: number,
): -1 | 0 | 1 {
  const dx = playerX - dogX;
  if (Math.abs(dx) <= followDistance) return 0;
  return dx > 0 ? 1 : -1;
}

/** Wie sich der Leinenzug auf den Menschen auswirkt. */
export interface PlayerLeashResponse {
  /** Beschleunigung (px/s²), die tatsächlich am Menschen ankommt. */
  accelX: number;
  /** Faktor auf seine Höchstgeschwindigkeit (1 = ungebremst). */
  speedFactor: number;
}

/**
 * Der Hund zieht den Menschen mit — aber nur, solange der sich nicht dagegen
 * stemmt:
 * - Kein Input oder gleiche Richtung → voller Zug, der Mensch wird mitgezogen.
 * - Gegenläufiger Input → der Zug wird gedämpft (resistDamping), dafür kostet
 *   das Gegenhalten Tempo (speedFactor sinkt bis maxSlowdown).
 */
export function playerLeashResponse(
  input: -1 | 0 | 1,
  pullX: number,
  cfg: LeashConfig,
): PlayerLeashResponse {
  if (pullX === 0 || input === 0 || Math.sign(pullX) === input) {
    return { accelX: pullX, speedFactor: 1 };
  }

  // Zug und Laufrichtung sind gegenläufig: Anteil der maximal möglichen
  // Zugkraft bestimmt, wie stark das Gegenhalten bremst.
  const maxPull = cfg.maxAccel * cfg.playerTug;
  const ratio = maxPull > 0 ? Math.min(1, Math.abs(pullX) / maxPull) : 0;
  return {
    accelX: pullX * cfg.resistDamping,
    speedFactor: 1 - ratio * cfg.maxSlowdown,
  };
}

/**
 * Stützpunkte für die gezeichnete Leine. Eine schlaffe Leine hängt in der
 * Mitte durch (proportional zur ungenutzten Länge), eine straffe ist gerade.
 */
export function leashPoints(
  player: Vec2,
  dog: Vec2,
  cfg: LeashConfig,
  sagPx: number,
  segments = 8,
): Vec2[] {
  const dist = Math.hypot(player.x - dog.x, player.y - dog.y);
  const slack = Math.max(0, cfg.length - dist) / cfg.length;
  const sag = slack * sagPx;

  const points: Vec2[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Parabel: an den Enden 0, in der Mitte maximaler Durchhang.
    const droop = 4 * t * (1 - t) * sag;
    points.push({
      x: player.x + (dog.x - player.x) * t,
      y: player.y + (dog.y - player.y) * t + droop,
    });
  }
  return points;
}
