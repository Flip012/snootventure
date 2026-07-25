import { describe, expect, it } from 'vitest';
import { bobPosition, lightFalloff, pendulumAngle, shadowFrom } from '../core/lightMath';

describe('pendulumAngle', () => {
  const swing = { amplitudeRad: 0.5, periodMs: 2000 };

  it('startet bei 0 (ohne Phase) und erreicht die Amplitude nach T/4', () => {
    expect(pendulumAngle(0, swing)).toBeCloseTo(0);
    expect(pendulumAngle(500, swing)).toBeCloseTo(0.5);
    expect(pendulumAngle(1000, swing)).toBeCloseTo(0);
    expect(pendulumAngle(1500, swing)).toBeCloseTo(-0.5);
  });

  it('respektiert den Phasenversatz', () => {
    expect(pendulumAngle(0, { ...swing, phaseRad: Math.PI / 2 })).toBeCloseTo(0.5);
  });
});

describe('bobPosition', () => {
  it('hängt bei Winkel 0 senkrecht unter der Aufhängung', () => {
    expect(bobPosition(100, 50, 120, 0)).toEqual({ x: 100, y: 170 });
  });

  it('schwingt bei positivem Winkel nach rechts und leicht nach oben', () => {
    const p = bobPosition(100, 50, 120, 0.5);
    expect(p.x).toBeGreaterThan(100);
    expect(p.y).toBeLessThan(170);
    expect(p.y).toBeGreaterThan(50);
  });
});

describe('lightFalloff', () => {
  it('ist 1 an der Quelle und 0 ab dem Radius', () => {
    expect(lightFalloff(0, 300)).toBe(1);
    expect(lightFalloff(300, 300)).toBe(0);
    expect(lightFalloff(400, 300)).toBe(0);
  });

  it('fällt monoton ab', () => {
    expect(lightFalloff(50, 300)).toBeGreaterThan(lightFalloff(150, 300));
    expect(lightFalloff(150, 300)).toBeGreaterThan(lightFalloff(250, 300));
  });
});

describe('shadowFrom', () => {
  it('liefert null außerhalb des Lichtradius', () => {
    expect(shadowFrom(0, 0, 500, 0, 300, 0.55)).toBeNull();
  });

  it('wirft den Schatten von der Lampe weg', () => {
    const right = shadowFrom(100, 400, 180, 640, 400, 0.55);
    const left = shadowFrom(300, 400, 220, 640, 400, 0.55);
    expect(right).not.toBeNull();
    expect(left).not.toBeNull();
    expect(right!.offsetX).toBeGreaterThan(0);
    expect(left!.offsetX).toBeLessThan(0);
  });

  it('wird näher an der Lampe kräftiger und direkt darunter kompakt', () => {
    const near = shadowFrom(100, 400, 110, 560, 400, 0.55)!;
    const far = shadowFrom(100, 400, 320, 640, 400, 0.55)!;
    expect(near.alpha).toBeGreaterThan(far.alpha);
    expect(near.stretch).toBeLessThan(far.stretch);
  });
});
