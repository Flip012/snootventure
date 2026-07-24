/**
 * Pure layer-presentation math — NO Phaser dependency, so the diorama transform
 * and switch resolution can be unit-tested. `LayerManager` feeds these into
 * Phaser container transforms.
 *
 * Convention: a layer's "distance" `d = layerIndex - activeIndex`.
 *   d = 0  → the active layer (identity: full size, no offset, opaque).
 *   d > 0  → behind the active layer (smaller, shifted up, darkened).
 *   d < 0  → in front of the active layer (pushed out / faded so it can't block
 *            the view — used during M3 switches).
 */

/** Tunables the transform needs (subset of GameConfig.layers). */
export interface LayerVisualConfig {
  scaleStep: number;
  yOffsetStep: number;
  tintStep: number;
  frontHide: { fadeTo: number; slideY: number };
}

export interface LayerPresentation {
  /** Uniform container scale. */
  scale: number;
  /** Vertical shift in canonical px (negative = up). */
  yOffset: number;
  /** Container alpha. */
  alpha: number;
  /** 0..1 blend of the layer colour toward the depth-fog colour. */
  darken: number;
  /** Render order: higher = closer to the camera. */
  depth: number;
  /** True when the layer is in front of the active one and should be hidden. */
  hidden: boolean;
}

const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export function computeLayerPresentation(
  layerIndex: number,
  activeIndex: number,
  cfg: LayerVisualConfig,
): LayerPresentation {
  const d = layerIndex - activeIndex;

  if (d === 0) {
    return { scale: 1, yOffset: 0, alpha: 1, darken: 0, depth: 0, hidden: false };
  }

  if (d > 0) {
    // Behind: progressively smaller, higher, darker.
    return {
      scale: Math.max(0.05, 1 - cfg.scaleStep * d),
      yOffset: cfg.yOffsetStep * d,
      alpha: 1,
      darken: clamp(cfg.tintStep * d, 0, 1),
      depth: -d,
      hidden: false,
    };
  }

  // In front (d < 0): larger and pushed down/out, faded so it doesn't block view.
  const k = -d;
  return {
    scale: 1 + cfg.scaleStep * k,
    yOffset: cfg.frontHide.slideY * k,
    alpha: cfg.frontHide.fadeTo,
    darken: 0,
    depth: k,
    hidden: true,
  };
}

/**
 * Resolve the target layer index for a switch in `dir` (+1 = one layer further
 * back, -1 = one layer toward the front), clamped to the valid range.
 */
export function resolveTargetLayer(activeIndex: number, dir: number, count: number): number {
  return clamp(activeIndex + Math.sign(dir), 0, count - 1);
}

/** Blend a packed 0xRRGGBB colour toward `target` by `t` (0..1). */
export function mixColor(color: number, target: number, t: number): number {
  const c = clamp(t, 0, 1);
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const tr = (target >> 16) & 0xff;
  const tg = (target >> 8) & 0xff;
  const tb = target & 0xff;
  const nr = Math.round(r + (tr - r) * c);
  const ng = Math.round(g + (tg - g) * c);
  const nb = Math.round(b + (tb - b) * c);
  return (nr << 16) | (ng << 8) | nb;
}
