import type { SwitchZoneDef } from '../core/layerMath';

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

export interface LayerDef {
  readonly platforms: readonly PlatformDef[];
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
  },
];

/** Switch-Zonen (ab M3): kanonische Rechtecke + verbundene Ebenen. */
export const TEST_ZONES: readonly SwitchZoneDef[] = [
  { rect: { x: 230, y: 472, width: 96, height: 200 }, layers: [0, 1] },
  { rect: { x: 840, y: 472, width: 96, height: 200 }, layers: [0, 1, 2] },
  { rect: { x: 1720, y: 472, width: 96, height: 200 }, layers: [1, 2] },
];
