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
    backgroundColor: '#12161f',
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
    tintStep: 0.18,
    /** Distinct colour stimmung per layer (front → back) for readability. */
    colors: [0x4fa4ff, 0x8b7bd8, 0x69c07a] as number[],
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
