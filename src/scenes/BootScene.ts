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

    this.scene.start('game');
  }

  private makeRectTexture(key: string, w: number, h: number, color: number): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
