import { GameConfig } from '../config/GameConfig';
import type { LevelData } from './types';

/**
 * M2 prototype layout: three depth layers, each with a ground strip and a few
 * platforms. The layouts differ per layer so the diorama depth reads clearly.
 * Switch points and a puzzle-shaped layout arrive with M3/M4; this exists only
 * to show the static three-layer presentation and single-layer movement.
 */
const W = GameConfig.world.levelWidth;
const H = GameConfig.world.levelHeight;
const GROUND_H = 48;

export const prototypeLevel: LevelData = {
  spawn: { layerIndex: 0, x: 120, y: H - 160 },
  layers: [
    // Layer 0 — front (playable). Lamps live here and light the scene.
    {
      platforms: [
        { x: 0, y: H - GROUND_H, w: W, h: GROUND_H },
        { x: 360, y: H - 170, w: 200, h: 24 },
        { x: 660, y: H - 280, w: 180, h: 24 },
        { x: 980, y: H - 200, w: 160, h: 24 },
        { x: 1260, y: H - 320, w: 220, h: 24 },
        { x: 1620, y: H - 210, w: 180, h: 24 },
        { x: 1980, y: H - 300, w: 260, h: 24 },
      ],
      lamps: [
        // Static bulb lighting the start area.
        { x: 200, y: 470, radius: 240 },
        // Swinging lamp over the low platform — shadows sway across the ground.
        { x: 720, y: 150, radius: 240, swing: { amplitudeDeg: 30, periodMs: 2800, length: 150 } },
        // Static bulb mid-level.
        { x: 1080, y: 360, radius: 250 },
        // Swinging lamp, out of phase with the first.
        { x: 1360, y: 130, radius: 240, swing: { amplitudeDeg: 24, periodMs: 2200, length: 170, phaseDeg: 90 } },
        // Static bulb.
        { x: 1720, y: 380, radius: 230 },
        // Swinging lamp near the end.
        { x: 2080, y: 150, radius: 240, swing: { amplitudeDeg: 30, periodMs: 3000, length: 150, phaseDeg: 45 } },
      ],
    },
    // Layer 1 — middle (purple).
    {
      platforms: [
        { x: 0, y: H - GROUND_H, w: W, h: GROUND_H },
        { x: 220, y: H - 240, w: 240, h: 24 },
        { x: 620, y: H - 360, w: 200, h: 24 },
        { x: 1040, y: H - 250, w: 220, h: 24 },
        { x: 1440, y: H - 380, w: 200, h: 24 },
        { x: 1820, y: H - 260, w: 240, h: 24 },
      ],
    },
    // Layer 2 — back (green).
    {
      platforms: [
        { x: 0, y: H - GROUND_H, w: W, h: GROUND_H },
        { x: 120, y: H - 320, w: 260, h: 24 },
        { x: 560, y: H - 440, w: 220, h: 24 },
        { x: 1000, y: H - 340, w: 240, h: 24 },
        { x: 1500, y: H - 460, w: 220, h: 24 },
        { x: 1960, y: H - 360, w: 260, h: 24 },
      ],
    },
  ],
};
