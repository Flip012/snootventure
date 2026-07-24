import { describe, expect, it } from 'vitest';
import {
  computeLayerPresentation,
  rectsOverlap,
  TransitionGuard,
  zoneAllowsSwitch,
  type LayerPresentationConfig,
  type SwitchZoneDef,
} from '../core/layerMath';

const CFG: LayerPresentationConfig = {
  layerScaleStep: 0.08,
  layerYOffsetStep: 26,
  layerTintStep: 0.22,
  frontLayerHide: { mode: 'fadeSlide', slideY: 60, fadeTo: 0.06 },
};

describe('computeLayerPresentation', () => {
  it('aktive Ebene (Abstand 0): Identität', () => {
    const p = computeLayerPresentation(0, CFG);
    expect(p.scale).toBe(1);
    expect(p.yOffset).toBe(0);
    expect(p.alpha).toBe(1);
    expect(p.darken).toBe(0);
    expect(p.depth).toBe(0);
  });

  it('Ebene dahinter (Abstand 1): kleiner, höher, dunkler, tieferer Depth', () => {
    const p = computeLayerPresentation(1, CFG);
    expect(p.scale).toBeCloseTo(0.92);
    expect(p.yOffset).toBeCloseTo(-26);
    expect(p.alpha).toBe(1);
    expect(p.darken).toBeCloseTo(0.22);
    expect(p.depth).toBe(-1);
  });

  it('Ebene davor (Abstand -1): ausgeblendet und nach unten geslidet', () => {
    const p = computeLayerPresentation(-1, CFG);
    expect(p.scale).toBeCloseTo(1.08);
    expect(p.yOffset).toBeCloseTo(60);
    expect(p.alpha).toBeCloseTo(0.06);
    expect(p.darken).toBe(0);
    expect(p.depth).toBe(1);
  });

  it('fraktionaler Abstand (Transition-Zwischenzustand) interpoliert stetig', () => {
    const p = computeLayerPresentation(0.5, CFG);
    expect(p.scale).toBeCloseTo(0.96);
    expect(p.yOffset).toBeCloseTo(-13);
    expect(p.darken).toBeCloseTo(0.11);
  });

  it('frontLayerHide mode "fade" slidet nicht', () => {
    const p = computeLayerPresentation(-1, {
      ...CFG,
      frontLayerHide: { ...CFG.frontLayerHide, mode: 'fade' },
    });
    expect(p.yOffset).toBe(0);
    expect(p.alpha).toBeCloseTo(0.06);
  });

  it('Scale ist nach unten auf 0.5 begrenzt', () => {
    expect(computeLayerPresentation(10, CFG).scale).toBe(0.5);
  });
});

describe('TransitionGuard', () => {
  it('blockt weitere Wechsel, solange eine Transition läuft', () => {
    const guard = new TransitionGuard();
    expect(guard.active).toBe(false);
    expect(guard.begin()).toBe(true);
    expect(guard.active).toBe(true);
    expect(guard.begin()).toBe(false); // zweiter Wechsel geblockt
    guard.end();
    expect(guard.begin()).toBe(true); // danach wieder frei
  });
});

describe('zoneAllowsSwitch (Eligibility)', () => {
  const zone: SwitchZoneDef = {
    rect: { x: 100, y: 400, width: 96, height: 200 },
    layers: [0, 1],
  };
  const bodyInside = { x: 120, y: 500, width: 28, height: 40 };
  const bodyOutside = { x: 300, y: 500, width: 28, height: 40 };

  it('erlaubt Wechsel bei Overlap zwischen verbundenen Ebenen', () => {
    expect(zoneAllowsSwitch(zone, bodyInside, 0, 1)).toBe(true);
    expect(zoneAllowsSwitch(zone, bodyInside, 1, 0)).toBe(true);
  });

  it('verweigert ohne Overlap', () => {
    expect(zoneAllowsSwitch(zone, bodyOutside, 0, 1)).toBe(false);
  });

  it('verweigert Ebenen, die die Zone nicht verbindet', () => {
    expect(zoneAllowsSwitch(zone, bodyInside, 1, 2)).toBe(false);
    expect(zoneAllowsSwitch(zone, bodyInside, 2, 1)).toBe(false);
  });

  it('Wechselpunkt am Rand: reine Kanten-Berührung zählt nicht als Overlap', () => {
    // Body endet exakt an der linken Zonenkante (x+width === zone.x)
    const touching = { x: 72, y: 500, width: 28, height: 40 };
    expect(rectsOverlap(zone.rect, touching)).toBe(false);
    // 1px Überlappung reicht
    const oneIn = { x: 73, y: 500, width: 28, height: 40 };
    expect(rectsOverlap(zone.rect, oneIn)).toBe(true);
  });

  it('Overlap gilt auch in der Luft — kein Grounded-Zwang in der Eligibility', () => {
    const airborne = { x: 120, y: 420, width: 28, height: 40 }; // oben in der Zone
    expect(zoneAllowsSwitch(zone, airborne, 0, 1)).toBe(true);
  });
});
