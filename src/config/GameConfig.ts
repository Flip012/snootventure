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
    lightStrength: 0.75, // globale Lampen-Helligkeit (1 = volle Erase-Stärke)
    // Lampen strahlen nach unten: Kegel-Zentrum liegt um diesen Anteil des
    // Radius UNTER der Birne — Boden/Schatten bekommen Licht, oben bleibt dunkel
    lightCenterOffset: 0.28,
    glowAlpha: 0.14, // Leuchtkorona um die Lampe
    glowScale: 0.32, // Korona-Größe relativ zum Lichtradius
    // Lampen fernerer Ebenen stanzen schwächer: Faktor = 1 - depthDimming * (1 - Scale)
    depthDimming: 4,
    shadowMaxAlpha: 1, // maximale Deckkraft des Spieler-Schattens
    shadowBaseWidth: 62, // Schattenbreite (px) direkt unter der Lampe
    shadowHeight: 16, // Schatten-Ellipsenhöhe (px)
    ropeColor: 0x4a4a4a,
    bulbColor: 0xf2f2f2,
  },

  // --- Player (schwarze Silhouette, im Dunkeln nur Augen sichtbar) ---
  // Schlankere, höhere Proportionen → menschlichere Silhouette
  playerWidth: 22,
  playerHeight: 46,
  playerColor: 0x0d0d0d,
  // Respawn-Punkt, wenn der Player durchfällt (Ebene ohne Plattform)
  spawn: { x: 120, y: 600 },

  // --- Hund (folgt dem Player, hängt an der Leine, hat eigenen Kopf) ---
  dog: {
    width: 34,
    height: 20,
    maxSpeed: 250, // etwas schneller als der Player, damit er aufholen kann
    accel: 2200,
    airAccel: 1400,
    drag: 2600,
    airDrag: 500,
    // Hunde-Hüpfer: ~19px hoch (v²/2g) — kommt allein KEINE 67px-Stufe hoch,
    // dafür muss der Mensch ihn an der Leine hochziehen.
    jumpVelocity: -210,
    followDistance: 70, // näher als das läuft er nicht heran
    spawnOffsetX: -60, // Startposition relativ zum Player-Spawn
    // Eigenständiges Verhalten (Schnüffeln/Streunen) in Ruhephasen
    brain: {
      sniffMs: [700, 1800] as [number, number],
      wanderMs: [500, 1200] as [number, number],
      followMs: [900, 2000] as [number, number],
      sniffChance: 0.45, // Rest verteilt sich auf Streunen
      /** Ab diesem Anteil der Leinenlänge zieht die Leine, der Hund folgt. */
      leashHeel: 0.85,
    },
  },

  // --- Leine (Feder-Constraint zwischen Player und Hund) ---
  leash: {
    length: 130, // ab dieser kanonischen Distanz wird die Leine straff
    spring: 20, // Zug-Beschleunigung (px/s²) pro px Überdehnung
    maxAccel: 2600, // Deckel > gravityY, damit der Hund an der Kante baumeln kann
    playerTug: 0.32, // Anteil des Zugs, der als Ruck auf den Menschen wirkt
    // Stemmt sich der Mensch gegen den Zug, kommt weniger Kraft an …
    resistDamping: 0.4,
    // … dafür bremst der ziehende Hund ihn um bis zu diesen Anteil aus.
    maxSlowdown: 0.5,
    sagPx: 26, // maximaler Durchhang der lockeren Leine (nur visuell)
    color: 0x8a8a8a,
  },

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
