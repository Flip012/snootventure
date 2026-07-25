/**
 * Pure Licht-/Schatten-Mathematik — frei von Phaser, deterministisch testbar.
 * Pendelbewegung schwingender Lampen, Licht-Falloff und die Parameter des
 * projizierten Spieler-Schattens.
 */

export interface SwingDef {
  /** Maximaler Ausschlag in Radiant (0 = statisch). */
  readonly amplitudeRad: number;
  /** Dauer einer vollen Schwingung in ms. */
  readonly periodMs: number;
  /** Phasenversatz, damit nicht alle Lampen synchron schwingen. */
  readonly phaseRad?: number;
}

/** Pendelwinkel zur Zeit t (0 = senkrecht nach unten). */
export function pendulumAngle(tMs: number, swing: SwingDef): number {
  const phase = swing.phaseRad ?? 0;
  return swing.amplitudeRad * Math.sin((2 * Math.PI * tMs) / swing.periodMs + phase);
}

/** Position des Lampenkörpers: Aufhängung + Seil der Länge L unter Winkel θ. */
export function bobPosition(
  pivotX: number,
  pivotY: number,
  length: number,
  angleRad: number,
): { x: number; y: number } {
  return {
    x: pivotX + Math.sin(angleRad) * length,
    y: pivotY + Math.cos(angleRad) * length,
  };
}

/** Lichtintensität 0..1 im Abstand dist von der Quelle (quadratischer Falloff). */
export function lightFalloff(dist: number, radius: number, exponent = 2): number {
  if (radius <= 0) return 0;
  const t = Math.max(0, 1 - dist / radius);
  return Math.pow(t, exponent);
}

/** Parameter für den vom Licht geworfenen Boden-Schatten einer Figur. */
export interface ShadowParams {
  /** Horizontale Verschiebung des Schattens weg von der Lampe (px). */
  offsetX: number;
  /** Horizontale Streckung (1 = direkt unter der Lampe). */
  stretch: number;
  /** Deckkraft, proportional zur Lichtintensität an der Figur. */
  alpha: number;
}

/**
 * Schatten einer Figur bei (targetX, targetY) unter einer Lampe bei
 * (lampX, lampY). null, wenn die Figur praktisch unbeleuchtet ist.
 * Der Schatten wandert von der Lampe weg und wird dabei länger — bei einer
 * schwingenden Lampe entsteht so der typische sweepende Schatten.
 */
export function shadowFrom(
  lampX: number,
  lampY: number,
  targetX: number,
  targetY: number,
  radius: number,
  maxAlpha: number,
): ShadowParams | null {
  // Linearer Falloff statt quadratisch: Schatten bleiben auch am Rand des
  // Kegels lesbar, sonst sind sie nur direkt unter der Lampe sichtbar.
  const intensity = lightFalloff(Math.hypot(targetX - lampX, targetY - lampY), radius, 1);
  if (intensity < 0.02) return null;

  const dx = targetX - lampX;
  return {
    offsetX: Math.max(-48, Math.min(48, dx * 0.35)),
    stretch: 1 + Math.min(1.6, Math.abs(dx) / (radius * 0.45)),
    alpha: maxAlpha * intensity,
  };
}
