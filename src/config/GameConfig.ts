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
  // Graustufen pro Ebene (Index 0 = vorderste Ebene) — Noir-Look, Tiefe
  // liest sich über Helligkeit + Abdunkelung
  layerColors: [
    { platform: 0xdedede }, // Ebene 0: hellstes Grau
    { platform: 0xaaaaaa }, // Ebene 1: mittleres Grau
    { platform: 0x7e7e7e }, // Ebene 2: dunkles Grau
  ],

  // --- Licht & Dunkelheit ---
  lighting: {
    overlayAlpha: 0.94, // Grunddunkelheit (1 = pechschwarz)
    overlayMargin: 0.12, // Überstand der Dunkelheits-Maske (deckt Kamera-Zoom-Puls)
    // Interne Auflösung der Masken-Textur (0.5 = halbe Kantenlänge, 4x weniger
    // Fillrate — weiches Licht verzeiht das, wichtig für Mobile/SwiftShader)
    maskResolution: 0.5,
    glowAlpha: 0.18, // Leuchtkorona um die Lampe
    glowScale: 0.32, // Korona-Größe relativ zum Lichtradius
    // Lampen fernerer Ebenen stanzen schwächer: Faktor = 1 - depthDimming * (1 - Scale)
    depthDimming: 4,
    shadowMaxAlpha: 0.65, // maximale Deckkraft des Spieler-Schattens
    shadowBaseWidth: 46, // Schattenbreite (px) direkt unter der Lampe
    shadowHeight: 12, // Schatten-Ellipsenhöhe (px)
    ropeColor: 0x4a4a4a,
    bulbColor: 0xf2f2f2,
  },

  // --- Player (schwarze Silhouette, im Dunkeln nur Augen sichtbar) ---
  playerWidth: 28,
  playerHeight: 40,
  playerColor: 0x0d0d0d,
  // Respawn-Punkt, wenn der Player durchfällt (Ebene ohne Plattform)
  spawn: { x: 120, y: 600 },

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
