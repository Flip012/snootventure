/**
 * Central configuration — the single place to tune the prototype.
 *
 * Everything that affects game feel (movement, jump, assist timings) or the
 * diorama depth effect (layer scaling / offset / tint) and the layer transition
 * lives here so it can be iterated on quickly. Keep gameplay code free of magic
 * numbers; read from `GameConfig` instead.
 */
export const GameConfig = {
  world: {
    /** Logical viewport (scaled to fit the screen, incl. mobile). */
    viewWidth: 960,
    viewHeight: 540,
    /** Total level bounds — larger than the viewport so the camera moves. */
    levelWidth: 2400,
    levelHeight: 720,
    /** Near-black — the world is dark; lamps carve out what you can see. */
    backgroundColor: '#050506',
  },

  player: {
    // --- horizontal movement (acceleration-based, not instant) ---
    /** px/s² acceleration toward the input direction while grounded. */
    moveAccel: 2600,
    /** px/s² acceleration while airborne (less control in the air). */
    airAccel: 1800,
    /** px/s² deceleration toward 0 when no input is held (grounded). */
    groundFriction: 2400,
    /** px/s² deceleration when no input is held (airborne — floatier). */
    airFriction: 600,
    /** Maximum horizontal speed in px/s. */
    maxSpeed: 260,

    // --- vertical movement ---
    /** World gravity in px/s² (applied by Arcade physics). */
    gravityY: 1500,
    /** Terminal fall speed in px/s. */
    maxFallSpeed: 900,
    /** Initial jump velocity in px/s (negative = up). */
    jumpVelocity: -560,
    /**
     * Variable jump: when the jump key is released while still moving up, the
     * upward velocity is multiplied by this factor (lower = shorter hop).
     */
    variableJumpCut: 0.45,

    // --- assist timings (milliseconds) ---
    /** Grace period after leaving a ledge during which a jump still works. */
    coyoteMs: 100,
    /** A jump pressed this many ms before landing still fires on landing. */
    jumpBufferMs: 120,

    // --- collision box (also the placeholder sprite size) ---
    width: 28,
    height: 40,
    /** Body silhouette — dark grey, only faintly visible when lit by a lamp. */
    color: 0x2b2d30,
  },

  /**
   * Layer / diorama parameters. Consumed from M2 onward, but defined here now
   * so there is exactly one source of truth for the depth look.
   */
  layers: {
    /** Number of playable depth layers in the prototype. */
    count: 3,
    /** Each layer further back is this fraction smaller (0.16 → 84% size). */
    scaleStep: 0.16,
    /** Each layer further back shifts up by this many px (negative = up). */
    yOffsetStep: -46,
    /** Darken/desaturate amount per depth step (0..1). */
    tintStep: 0.22,
    /** Colour that deeper layers blend toward (atmospheric depth fog). */
    depthFogColor: 0x050506,
    /** Monochrome greys per layer (front → back), brighter in front. */
    colors: [0xb9bdc1, 0x8b8f93, 0x64686c] as number[],
    /** How layers IN FRONT of the active one are pushed out of the way. */
    frontHide: {
      /** Fade the front layer(s) toward this alpha. */
      fadeTo: 0.0,
      /** …while sliding them down by this many px so they don't block view. */
      slideY: 120,
    },
  },

  transition: {
    /** Layer-switch tween duration in ms (spec: 400–600). */
    durationMs: 480,
    /** Phaser easing key, e.g. 'Cubic.easeInOut', 'Sine.easeInOut', 'Back.easeOut'. */
    easing: 'Cubic.easeInOut',
    /** Extra camera zoom applied per depth step during a switch. */
    cameraZoomPerDepth: 0.06,
  },

  /**
   * Darkness, lamps and cast shadows. The world is nearly black; each lamp
   * carves a soft circle of visibility, and the player casts a shadow away from
   * every nearby lamp. Swinging lamps make those shadows sway.
   */
  lighting: {
    /** Opacity of the darkness overlay outside any light (1 = pitch black). */
    ambientDarkness: 0.93,
    /** Colour of the darkness overlay. */
    overlayColor: 0x000000,
    /** Default light radius in world px if a lamp doesn't override it. */
    lightRadiusDefault: 230,
    /** Additive bulb-glow strength (0..1) and its size relative to the light. */
    glowAlpha: 0.55,
    glowScale: 0.62,
    /** Lamp fixtures (cord + bulb) drawn in greyscale. */
    lamp: { cordColor: 0x3a3d40, bulbColor: 0xf2f2f2, bulbRadius: 6 },

    /** Player cast-shadow look. */
    shadow: {
      color: 0x000000,
      /** Max opacity right next to a lamp. */
      opacity: 0.55,
      /** Shadow length range in world px (near lamp → far lamp). */
      minLen: 26,
      maxLen: 250,
      /** Shadow width as a factor of player width, at the foot / far end. */
      widthNear: 1.05,
      widthFar: 1.85,
      /** Beyond this distance a lamp casts no visible shadow. */
      maxDist: 560,
    },

    /** Glowing eyes — the only always-visible part of the player. */
    eyes: {
      color: 0xffffff,
      radius: 3,
      /** Horizontal spacing between the two eyes (px). */
      spacing: 9,
      /** Vertical offset from the body centre (negative = up toward the head). */
      offsetY: -9,
      /** Soft additive glow around each eye. */
      glowRadius: 9,
      glowAlpha: 0.5,
      /** How far the eyes shift toward the facing direction (px). */
      facingShift: 3,
    },

    /** Defaults for swinging lamps (a pendulum on a cord). */
    swingDefault: { amplitudeDeg: 26, periodMs: 2600, length: 92 },
  },

  /** On-screen touch controls (shown only on touch devices). */
  ui: {
    touch: {
      /** Button radius in logical px. */
      radius: 46,
      /** Gap between the left/right buttons. */
      gap: 26,
      /** Margin from the screen edges. */
      margin: 30,
      /** Translucent look that suits the dark scene. */
      fillColor: 0xffffff,
      fillAlpha: 0.1,
      strokeColor: 0xffffff,
      strokeAlpha: 0.35,
      labelColor: '#e8ebf0',
      /** Above everything else (overlay 500, eyes 600, debug 1000). */
      depth: 2000,
    },
  },

  debug: {
    /** Toggles the debug overlay (wired in M4). */
    toggleKey: 'F1',
  },
} as const;

export type GameConfigType = typeof GameConfig;

/** Colour stimmung for a layer index, wrapping and never undefined. */
export function layerColor(index: number): number {
  const colors = GameConfig.layers.colors;
  return colors[((index % colors.length) + colors.length) % colors.length] ?? 0xffffff;
}
