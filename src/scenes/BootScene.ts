import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

/**
 * Generates the placeholder textures used across the prototype and then hands
 * off to the game scene. Everything here is a plain coloured rectangle so the
 * build never depends on downloadable art; drop Kenney CC0 assets into
 * `public/assets/` and swap the loads here later (see README).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    // Player: a white rectangle at exact body size (tinted per layer at use).
    this.makeRectTexture('player', GameConfig.player.width, GameConfig.player.height, 0xffffff);
    // Generic 1×1 white pixel — scaled/tinted for platforms and zones.
    this.makeRectTexture('pixel', 1, 1, 0xffffff);
    // Soft radial white → transparent, used both to erase darkness (light
    // cones) and, additively, as bulb/eye glow.
    this.makeRadialTexture('radial', 256);

    this.scene.start('game');
  }

  /** White radial gradient, opaque centre fading to transparent edge. */
  private makeRadialTexture(key: string, size: number): void {
    const tex = this.textures.createCanvas(key, size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const r = size / 2;
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  private makeRectTexture(key: string, w: number, h: number, color: number): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
