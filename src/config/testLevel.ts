import type { SwitchZoneDef } from '../core/layerMath';
import type { SwingDef } from '../core/lightMath';

/**
 * Testlevel-Daten in kanonischen Weltkoordinaten (Welt 2400x720, Boden-
 * Oberkante bei y=672). Ebene 0 = vorn, Ebene 2 = hinten.
 *
 * **Sprungreichweite (aus GameConfig abgeleitet, bestimmt die Geometrie):**
 * jumpVelocity -430 und gravityY 1150 ergeben v²/2g ≈ 80 px Steighöhe und
 * bei maxSpeed 230 ≈ 172 px horizontale Weite. Alle Stufen sind deshalb
 * **67 px** hoch (672 → 605 → 538 → 471 → 404) und Lücken ≤ 140 px breit.
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

/**
 * Bewuchs und Stadtmobiliar am Boden. Fast alles davon ist für den Hund eine
 * Schnüffel- oder Pinkelstelle (`appeal` > 0) — Grasbüschel reizen mäßig,
 * Büsche und Laternenpfähle deutlich mehr.
 */
export type PropKind = 'bush' | 'shrub' | 'grass' | 'post' | 'weed';

export interface PropDef {
  readonly kind: PropKind;
  /** Fußpunkt in kanonischen Koordinaten (Unterkante). */
  readonly x: number;
  readonly y: number;
  /** Attraktivität für den Hund, 0 = uninteressant. */
  readonly appeal: number;
  /** Hier hebt der Hund auch mal das Bein. */
  readonly markable: boolean;
}

export interface LayerDef {
  readonly platforms: readonly PlatformDef[];
  readonly lamps: readonly LampDef[];
  readonly props: readonly PropDef[];
}

/** Kompakte Helfer, damit die Level-Daten lesbar bleiben. */
const bush = (x: number, y = 672): PropDef => ({
  kind: 'bush',
  x,
  y,
  appeal: 1,
  markable: true,
});
const shrub = (x: number, y = 672): PropDef => ({
  kind: 'shrub',
  x,
  y,
  appeal: 0.8,
  markable: true,
});
const post = (x: number, y = 672): PropDef => ({
  kind: 'post',
  x,
  y,
  appeal: 0.95,
  markable: true,
});
const grass = (x: number, y = 672): PropDef => ({
  kind: 'grass',
  x,
  y,
  appeal: 0.45,
  markable: false,
});
const weed = (x: number, y = 672): PropDef => ({
  kind: 'weed',
  x,
  y,
  appeal: 0.55,
  markable: false,
});

const GROUND_Y = 672;
const GROUND_H = 48;

/**
 * Route (Start auf Ebene 1 links, Ziel auf Ebene 2 oben rechts):
 *
 *   Ebene 1 → **Bodenlücke bei x 420 überspringen** → Zone B (x 840,
 *   verbindet alle drei) → Ebene 3 → **Lücke bei x 1250 überspringen** →
 *   Treppe ab x 1900 (drei Sprünge) → Zone D (x 2280, nur Ebene 2↔3) →
 *   Ebene 2 → Ziel.
 *
 * **Springen ist Pflicht:** Fünf Stellen der Route sind nur mit Sprung
 * passierbar — zwei Bodenlücken (je 110 px, bei 172 px Reichweite gut
 * schaffbar) und die drei 67-px-Stufen der Treppe.
 *
 * Das Ziel liegt auf Ebene 2 bei y 471 ganz rechts. Von der Ebene-2-Bodenhöhe
 * (672) sind das 201 px Anstieg, und die nächste Ebene-2-Plattform endet bei
 * x 1790 — 430 px entfernt. Damit ist das Ziel **ausschließlich** über die
 * Treppe auf Ebene 3 und Zone D erreichbar.
 */
export const TEST_LEVEL: readonly LayerDef[] = [
  // Ebene 0 (vorn, hellstes Grau) — Startebene mit zwei Bodenlücken
  {
    platforms: [
      { x: 0, y: GROUND_Y, width: 420, height: GROUND_H },
      // Lücke 420–530 (110 px) — erste Pflicht-Sprungstelle
      { x: 530, y: GROUND_Y, width: 670, height: GROUND_H },
      // Lücke 1200–1310
      { x: 1310, y: GROUND_Y, width: 440, height: GROUND_H },
      { x: 360, y: 605, width: 120 },
      { x: 680, y: 538, width: 160 },
      { x: 980, y: 605, width: 128 },
      { x: 1400, y: 538, width: 192 },
      { x: 1620, y: 471, width: 130 },
    ],
    lamps: [
      // Über Zone A — schwingt langsam, Schatten sweept durch die Zone
      { x: 278, y: 340, length: 130, radius: 320, swing: { amplitudeRad: 0.38, periodMs: 3000 } },
      // Über der ersten Bodenlücke — man soll sehen, wohin man springt
      { x: 475, y: 330, length: 125, radius: 300 },
      // Über Zone B — statisch
      { x: 888, y: 330, length: 145, radius: 340 },
      // Über der zweiten Bodenlücke
      { x: 1255, y: 340, length: 120, radius: 300 },
      // Mittelbereich — schwingt weiter aus, mit Phasenversatz
      {
        x: 1450,
        y: 330,
        length: 135,
        radius: 320,
        swing: { amplitudeRad: 0.5, periodMs: 3600, phaseRad: 1.3 },
      },
    ],
    // Bewuchs am Wegesrand — Hundeziele auf der Startebene
    props: [
      grass(70),
      bush(180),
      weed(330),
      shrub(600),
      post(760),
      grass(950),
      bush(1090),
      weed(1160),
      grass(1380),
      shrub(1520),
      post(1690),
      // Auf Plattformen: kleine Grasbüschel als Deko/Ziel
      grass(410, 605),
      weed(740, 538),
    ],
  },
  // Ebene 1 (Mitte) — Bodenlücke bei x 1000–1300; trägt rechts oben das Ziel,
  // das von hier aus bewusst NICHT erreichbar ist (siehe Kommentar oben).
  {
    platforms: [
      { x: 0, y: GROUND_Y, width: 1000, height: GROUND_H },
      { x: 1300, y: GROUND_Y, width: 1100, height: GROUND_H },
      { x: 200, y: 605, width: 160 },
      { x: 560, y: 538, width: 160 },
      { x: 900, y: 605, width: 128 },
      { x: 1450, y: 605, width: 192 },
      { x: 1650, y: 538, width: 140 },
      // Zielplattform — nur von Ebene 3 aus über Zone D (x 2280) erreichbar
      { x: 2220, y: 471, width: 180 },
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
      // Beleuchtet die Zielplattform
      { x: 2300, y: 250, length: 120, radius: 320 },
    ],
    props: [
      shrub(120),
      grass(300),
      bush(470),
      post(680),
      weed(860),
      grass(930),
      // rechts der Bodenlücke
      bush(1390),
      grass(1560),
      shrub(1730),
      post(1900),
      weed(2050),
      grass(2160),
      // auf der Zielplattform
      bush(2340, 471),
    ],
  },
  // Ebene 2 (hinten) — trägt die einzige Aufstiegs-Treppe zum Ziel (ab x 1900)
  {
    platforms: [
      { x: 0, y: GROUND_Y, width: 1250, height: GROUND_H },
      // Lücke 1250–1360 — Pflicht-Sprung auf dem Weg zur Treppe
      { x: 1360, y: GROUND_Y, width: 1040, height: GROUND_H },
      { x: 400, y: 605, width: 192 },
      { x: 760, y: 538, width: 192 },
      { x: 1120, y: 471, width: 130 },
      { x: 1500, y: 538, width: 224 },
      // Treppe nach oben — startet rechts von Zone C, damit die Zone frei bleibt
      { x: 1900, y: 605, width: 150 },
      { x: 2080, y: 538, width: 150 },
      { x: 2250, y: 471, width: 150 },
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
      // Über der Lücke auf dem Weg zur Treppe
      { x: 1305, y: 340, length: 120, radius: 300 },
      // Beleuchtet die Treppe und Zone D
      { x: 2120, y: 300, length: 130, radius: 330 },
    ],
    props: [
      bush(90),
      grass(240),
      shrub(520),
      weed(700),
      post(980),
      grass(1150),
      // rechts der Lücke
      shrub(1420),
      bush(1620),
      grass(1800),
      weed(2000),
      // auf den Treppenstufen
      grass(1980, 605),
      weed(2150, 538),
      bush(2330, 471),
    ],
  },
];

/** Switch-Zonen: kanonische Rechtecke + verbundene Ebenen. */
export const TEST_ZONES: readonly SwitchZoneDef[] = [
  { rect: { x: 230, y: 472, width: 96, height: 200 }, layers: [0, 1] },
  { rect: { x: 840, y: 472, width: 96, height: 200 }, layers: [0, 1, 2] },
  { rect: { x: 1720, y: 472, width: 96, height: 200 }, layers: [1, 2] },
  // Über der Bodenlücke von Ebene 1: Wechsel von Ebene 0 hierher → Fallen
  // (bewusst erlaubt, siehe CLAUDE.md). Extra hoch für Wechsel im Sprung.
  { rect: { x: 1080, y: 372, width: 96, height: 300 }, layers: [0, 1] },
  // Zone D: oben auf der Ebene-3-Treppe (y 471), verbindet NUR Ebene 2↔3 —
  // der einzige Zugang zur Zielplattform.
  { rect: { x: 2280, y: 371, width: 96, height: 100 }, layers: [1, 2] },
];

/**
 * Ziel auf Ebene 2 (Index 1), steht auf der Zielplattform (Oberkante y 471);
 * die Textur ist 40x56 groß, daher y = 471 - 56.
 */
export const GOAL = { x: 2280, y: 415, layer: 1 } as const;
