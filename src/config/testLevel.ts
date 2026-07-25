import type { SwitchZoneDef } from '../core/layerMath';
import type { SwingDef } from '../core/lightMath';

/**
 * Testlevel-Daten in kanonischen Weltkoordinaten (Welt 2400x720, Boden-
 * Oberkante bei y=672). Ebene 0 = vorn, Ebene 2 = hinten.
 * Ebene 1 hat bewusst eine Bodenlücke (x 1000–1300): Wechselt man dort hin,
 * wo keine Plattform ist, fällt der Player (dokumentiertes Verhalten).
 */

export interface PlatformDef {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height?: number;
}

/** Hängelampe: Aufhängung (x,y) + Seillänge; optional schwingend. */
export interface LampDef {
  readonly x: number;
  readonly y: number;
  readonly length: number;
  /** Lichtradius in kanonischen px. */
  readonly radius: number;
  readonly swing?: SwingDef;
}

export interface LayerDef {
  readonly platforms: readonly PlatformDef[];
  readonly lamps: readonly LampDef[];
}

const GROUND_Y = 672;
const GROUND_H = 48;

export const TEST_LEVEL: readonly LayerDef[] = [
  // Ebene 0 (vorn, Terrakotta) — Layout aus M1
  {
    platforms: [
      { x: 0, y: GROUND_Y, width: 2400, height: GROUND_H },
      { x: 360, y: 552, width: 192 },
      { x: 680, y: 452, width: 160 },
      { x: 980, y: 520, width: 128 },
      { x: 1280, y: 400, width: 192 },
      { x: 1660, y: 500, width: 160 },
      { x: 1980, y: 360, width: 224 },
    ],
    lamps: [
      // Über Zone A — schwingt langsam, Schatten sweept durch die Zone
      { x: 278, y: 340, length: 130, radius: 320, swing: { amplitudeRad: 0.38, periodMs: 3000 } },
      // Über Zone B — statisch
      { x: 888, y: 330, length: 145, radius: 340 },
      // Mittelbereich — schwingt weiter aus, mit Phasenversatz
      {
        x: 1450,
        y: 330,
        length: 135,
        radius: 320,
        swing: { amplitudeRad: 0.5, periodMs: 3600, phaseRad: 1.3 },
      },
      // Endbereich — statisch
      { x: 2080, y: 350, length: 115, radius: 300 },
    ],
  },
  // Ebene 1 (Mitte, Blau) — Boden mit Lücke bei x 1000–1300
  {
    platforms: [
      { x: 0, y: GROUND_Y, width: 1000, height: GROUND_H },
      { x: 1300, y: GROUND_Y, width: 1100, height: GROUND_H },
      { x: 200, y: 540, width: 160 },
      { x: 560, y: 430, width: 160 },
      { x: 900, y: 520, width: 128 },
      { x: 1450, y: 500, width: 192 },
      { x: 1800, y: 380, width: 160 },
      { x: 2100, y: 300, width: 160 },
    ],
    lamps: [
      { x: 560, y: 340, length: 130, radius: 310 },
      // Über der Bodenlücke + Fall-Zone — schwingt schnell und weit
      {
        x: 1128,
        y: 310,
        length: 155,
        radius: 340,
        swing: { amplitudeRad: 0.55, periodMs: 2600, phaseRad: 0.7 },
      },
      { x: 1850, y: 340, length: 120, radius: 300 },
    ],
  },
  // Ebene 2 (hinten, Grün)
  {
    platforms: [
      { x: 0, y: GROUND_Y, width: 2400, height: GROUND_H },
      { x: 400, y: 500, width: 192 },
      { x: 760, y: 380, width: 192 },
      { x: 1120, y: 300, width: 160 },
      { x: 1500, y: 420, width: 224 },
      { x: 1900, y: 260, width: 192 },
    ],
    lamps: [
      {
        x: 900,
        y: 320,
        length: 140,
        radius: 330,
        swing: { amplitudeRad: 0.3, periodMs: 4200, phaseRad: 2.1 },
      },
      { x: 1550, y: 330, length: 125, radius: 310 },
    ],
  },
];

/** Switch-Zonen (ab M3): kanonische Rechtecke + verbundene Ebenen. */
export const TEST_ZONES: readonly SwitchZoneDef[] = [
  { rect: { x: 230, y: 472, width: 96, height: 200 }, layers: [0, 1] },
  { rect: { x: 840, y: 472, width: 96, height: 200 }, layers: [0, 1, 2] },
  { rect: { x: 1720, y: 472, width: 96, height: 200 }, layers: [1, 2] },
  // Über der Bodenlücke von Ebene 1: Wechsel von Ebene 0 hierher → Fallen
  // (bewusst erlaubt, siehe CLAUDE.md). Extra hoch für Wechsel im Sprung.
  { rect: { x: 1080, y: 372, width: 96, height: 300 }, layers: [0, 1] },
];
