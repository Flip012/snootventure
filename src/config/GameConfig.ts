/**
 * Zentrale, tunebare Konfiguration für den Layer-Prototyp.
 * Alle Gameplay-/Präsentations-Werte leben hier — nirgendwo sonst hartcodieren.
 */
export const GAME_CONFIG = {
  // --- Viewport / Welt (kanonische, unskalierte Koordinaten) ---
  viewWidth: 960,
  viewHeight: 540,
  worldWidth: 2400,
  worldHeight: 720,

  // --- Horizontales Movement ---
  moveAccel: 1900, // px/s² am Boden
  airAccel: 1300, // px/s² in der Luft
  groundDrag: 2400, // px/s² Abbremsen am Boden ohne Input
  airDrag: 500, // px/s² Abbremsen in der Luft ohne Input
  maxSpeed: 230, // px/s horizontale Höchstgeschwindigkeit

  // --- Vertikales Movement / Sprung ---
  gravityY: 1150, // px/s²
  maxFallSpeed: 720, // px/s
  jumpVelocity: -430, // px/s (negativ = nach oben)
  variableJumpCut: 0.45, // Faktor auf v_y beim Loslassen der Sprungtaste im Aufstieg
  coyoteMs: 100, // Sprung noch möglich, nachdem der Boden verlassen wurde
  jumpBufferMs: 120, // Sprung-Input wird gepuffert, bevor der Boden erreicht wird

  // --- Ebenen / Diorama (ab M2 genutzt) ---
  layerCount: 3,
  transitionDurationMs: 500,
  transitionEasing: 'Cubic.easeInOut',
  cameraZoomPerDepth: 0.04, // zusätzlicher Kamera-Zoom pro Ebenen-Abstand
  layerScaleStep: 0.08, // Scale-Reduktion pro Ebene hinter der aktiven
  layerYOffsetStep: 26, // Y-Versatz (px) pro Ebene hinter der aktiven
  layerTintStep: 0.22, // Abdunkelung pro Ebene hinter der aktiven (0..1)
  frontLayerHide: {
    mode: 'fadeSlide' as 'fadeSlide' | 'fade' | 'none',
    slideY: 60, // px, wie weit die Front-Ebene nach unten gleitet
    fadeTo: 0.06, // Ziel-Alpha der Front-Ebene
  },
  // Farbstimmung pro Ebene (Index 0 = vorderste Ebene): [Plattform, Hintergrundakzent]
  layerColors: [
    { platform: 0xe2725b, accent: 0x8c3b2e }, // Ebene 0: warmes Terrakotta
    { platform: 0x5ba8e2, accent: 0x2e5d8c }, // Ebene 1: kühles Blau
    { platform: 0x7ee081, accent: 0x3d8c40 }, // Ebene 2: Grün
  ],

  // --- Player ---
  playerWidth: 28,
  playerHeight: 40,
  playerColor: 0xf5e663,

  // --- Debug / Keys ---
  debugKey: 'F1',
  keys: {
    left: ['A', 'LEFT'],
    right: ['D', 'RIGHT'],
    // Sprung bewusst NUR Space: W/S und Hoch/Runter sind ab M3 für den
    // Ebenenwechsel reserviert.
    jump: ['SPACE'],
    layerUp: ['W', 'UP'], // ab M3: Ebene nach hinten
    layerDown: ['S', 'DOWN'], // ab M3: Ebene nach vorn
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;
