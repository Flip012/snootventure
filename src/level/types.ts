/** Canonical (unscaled world-space) rectangle, top-left based. */
export interface PlatformRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Parameters for a swinging (pendulum) lamp. */
export interface LampSwing {
  /** Peak swing angle from vertical, in degrees. */
  amplitudeDeg: number;
  /** Full back-and-forth period in milliseconds. */
  periodMs: number;
  /** Cord length: how far the bulb hangs below the pivot (px). */
  length: number;
  /** Optional phase offset in degrees so multiple lamps don't sync. */
  phaseDeg?: number;
}

/**
 * A lamp light source (canonical coordinates).
 * - Static lamp: `(x, y)` is the bulb position.
 * - Swinging lamp: `(x, y)` is the pivot; the bulb hangs `swing.length` below
 *   and swings, so the light — and the shadows it casts — sway.
 */
export interface LampDef {
  x: number;
  y: number;
  /** Light radius in world px (defaults to GameConfig.lighting.lightRadiusDefault). */
  radius?: number;
  /** Present → the lamp swings on a cord. */
  swing?: LampSwing;
}

/** One depth layer's geometry (canonical coordinates). */
export interface LayerData {
  platforms: PlatformRect[];
  lamps?: LampDef[];
}

/** Where an entity starts: which layer and canonical position. */
export interface SpawnPoint {
  layerIndex: number;
  x: number;
  y: number;
}

/** A hand-built level: N layers plus the player spawn. */
export interface LevelData {
  layers: LayerData[];
  spawn: SpawnPoint;
}
