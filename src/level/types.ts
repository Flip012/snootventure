/** Canonical (unscaled world-space) rectangle, top-left based. */
export interface PlatformRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One depth layer's platform geometry (canonical coordinates). */
export interface LayerData {
  platforms: PlatformRect[];
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
