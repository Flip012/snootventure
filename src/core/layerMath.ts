/**
 * Pure Ebenen-Logik — frei von Phaser, deterministisch testbar.
 * Präsentations-Transforms, Switch-Zonen-Eligibility und der Transition-Guard.
 */

export interface FrontLayerHideConfig {
  readonly mode: 'fadeSlide' | 'fade' | 'none';
  readonly slideY: number;
  readonly fadeTo: number;
}

export interface LayerPresentationConfig {
  readonly layerScaleStep: number;
  readonly layerYOffsetStep: number;
  readonly layerTintStep: number;
  readonly frontLayerHide: FrontLayerHideConfig;
}

/** Visueller Zustand einer Ebene, abhängig vom Abstand zur aktiven Ebene. */
export interface LayerPresentation {
  /** Skalierung des Containers (aktive Ebene = 1). */
  scale: number;
  /** Zusätzlicher Y-Versatz des Containers in px. */
  yOffset: number;
  /** Container-Alpha (Front-Ebenen werden ausgeblendet). */
  alpha: number;
  /** Abdunkelung 0..1 für Ebenen hinter der aktiven. */
  darken: number;
  /** Render-Reihenfolge: aktive Ebene oben. */
  depth: number;
}

/**
 * Berechnet die Präsentation für eine Ebene mit Abstand `distance` zur
 * aktiven Ebene (positiv = dahinter, negativ = davor). `distance` darf
 * fraktional sein — während der Transition wird der aktive Index
 * kontinuierlich interpoliert und diese Funktion liefert Zwischenzustände.
 */
export function computeLayerPresentation(
  distance: number,
  cfg: LayerPresentationConfig,
): LayerPresentation {
  const behind = Math.max(0, distance);
  const front = Math.max(0, -distance);

  const scale = Math.max(0.5, 1 - distance * cfg.layerScaleStep);
  // "+ 0" normalisiert -0 zu +0 (bei behind === 0)
  let yOffset = -behind * cfg.layerYOffsetStep + 0;
  let alpha = 1;

  if (front > 0 && cfg.frontLayerHide.mode !== 'none') {
    const f = Math.min(1, front);
    alpha = 1 + (cfg.frontLayerHide.fadeTo - 1) * f;
    if (cfg.frontLayerHide.mode === 'fadeSlide') {
      yOffset += cfg.frontLayerHide.slideY * f;
    }
  }

  return {
    scale,
    yOffset,
    alpha,
    darken: Math.min(1, behind * cfg.layerTintStep),
    depth: -distance + 0,
  };
}

// ---------------------------------------------------------------------------
// Switch-Zonen
// ---------------------------------------------------------------------------

export interface RectLike {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Kanonisches Zonen-Rechteck + Ebenen, zwischen denen es Wechsel erlaubt. */
export interface SwitchZoneDef {
  readonly rect: RectLike;
  readonly layers: readonly number[];
}

/** Echte Überlappung (Kanten-Berührung zählt nicht). */
export function rectsOverlap(a: RectLike, b: RectLike): boolean {
  return (
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
  );
}

/**
 * Eligibility: Body überlappt die Zone UND die Zone verbindet Start- und
 * Ziel-Ebene. Bewusst KEIN Grounded-Zwang — Wechsel in der Luft ist erlaubt.
 */
export function zoneAllowsSwitch(
  zone: SwitchZoneDef,
  bodyRect: RectLike,
  fromLayer: number,
  toLayer: number,
): boolean {
  return (
    zone.layers.includes(fromLayer) &&
    zone.layers.includes(toLayer) &&
    rectsOverlap(zone.rect, bodyRect)
  );
}

// ---------------------------------------------------------------------------
// Transition-Guard
// ---------------------------------------------------------------------------

/** Blockt weitere Wechsel, solange eine Transition läuft. */
export class TransitionGuard {
  private running = false;

  get active(): boolean {
    return this.running;
  }

  /** true = Transition darf starten; false = es läuft bereits eine. */
  begin(): boolean {
    if (this.running) return false;
    this.running = true;
    return true;
  }

  end(): void {
    this.running = false;
  }
}
