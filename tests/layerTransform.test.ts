import { describe, expect, it } from 'vitest';
import {
  computeLayerPresentation,
  mixColor,
  resolveTargetLayer,
  type LayerVisualConfig,
} from '../src/systems/layerTransform';

const cfg: LayerVisualConfig = {
  scaleStep: 0.16,
  yOffsetStep: -46,
  tintStep: 0.18,
  frontHide: { fadeTo: 0.0, slideY: 120 },
};

describe('computeLayerPresentation', () => {
  it('active layer is the identity transform', () => {
    const p = computeLayerPresentation(1, 1, cfg);
    expect(p).toMatchObject({ scale: 1, yOffset: 0, alpha: 1, darken: 0, depth: 0, hidden: false });
  });

  it('layers behind shrink, shift up and darken', () => {
    const p = computeLayerPresentation(1, 0, cfg);
    expect(p.scale).toBeCloseTo(1 - 0.16, 5);
    expect(p.yOffset).toBe(-46); // negative = up
    expect(p.darken).toBeCloseTo(0.18, 5);
    expect(p.depth).toBe(-1);
    expect(p.hidden).toBe(false);
  });

  it('deeper layers are progressively smaller and darker (monotonic)', () => {
    const near = computeLayerPresentation(1, 0, cfg);
    const far = computeLayerPresentation(2, 0, cfg);
    expect(far.scale).toBeLessThan(near.scale);
    expect(far.darken).toBeGreaterThan(near.darken);
    expect(far.depth).toBeLessThan(near.depth);
  });

  it('never scales to zero or negative', () => {
    const p = computeLayerPresentation(20, 0, cfg);
    expect(p.scale).toBeGreaterThan(0);
  });

  it('layers in front of the active one are hidden and faded', () => {
    const p = computeLayerPresentation(0, 1, cfg);
    expect(p.hidden).toBe(true);
    expect(p.alpha).toBe(cfg.frontHide.fadeTo);
    expect(p.scale).toBeGreaterThan(1);
    expect(p.yOffset).toBe(cfg.frontHide.slideY);
    expect(p.depth).toBe(1);
  });
});

describe('resolveTargetLayer', () => {
  it('moves one step in the given direction', () => {
    expect(resolveTargetLayer(0, 1, 3)).toBe(1);
    expect(resolveTargetLayer(1, 1, 3)).toBe(2);
    expect(resolveTargetLayer(2, -1, 3)).toBe(1);
  });

  it('clamps at both ends', () => {
    expect(resolveTargetLayer(0, -1, 3)).toBe(0);
    expect(resolveTargetLayer(2, 1, 3)).toBe(2);
  });

  it('treats any positive/negative magnitude as a single step', () => {
    expect(resolveTargetLayer(0, 5, 3)).toBe(1);
    expect(resolveTargetLayer(2, -9, 3)).toBe(1);
  });
});

describe('mixColor', () => {
  it('returns the source at t=0 and the target at t=1', () => {
    expect(mixColor(0x4fa4ff, 0x000000, 0)).toBe(0x4fa4ff);
    expect(mixColor(0x4fa4ff, 0x123456, 1)).toBe(0x123456);
  });

  it('blends halfway (round half up)', () => {
    expect(mixColor(0xffffff, 0x000000, 0.5)).toBe(0x808080);
  });

  it('clamps t outside 0..1', () => {
    expect(mixColor(0xffffff, 0x000000, 2)).toBe(0x000000);
    expect(mixColor(0xffffff, 0x000000, -1)).toBe(0xffffff);
  });
});
