import Phaser from 'phaser';
import { GameConfig, layerColor } from '../config/GameConfig';
import { Player } from '../entities/Player';

/** A single platform rectangle in canonical world coordinates (top-left based). */
interface PlatformRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * M1 scene: one playable layer. A ground strip plus a few platforms, a player
 * with full platformer feel, and a follow camera. The layer system, switch
 * points and transitions arrive in M2/M3 — this scene stays deliberately small.
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;

  constructor() {
    super('game');
  }

  create(): void {
    const { levelWidth, levelHeight } = GameConfig.world;
    this.physics.world.setBounds(0, 0, levelWidth, levelHeight);
    this.cameras.main.setBounds(0, 0, levelWidth, levelHeight);
    this.cameras.main.setBackgroundColor(GameConfig.world.backgroundColor);

    const platforms = this.buildPlatforms(this.m1Platforms(), layerColor(0));

    this.player = new Player(this, 120, levelHeight - 160);
    this.physics.add.collider(this.player.sprite, platforms);

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(120, 80);
  }

  override update(_time: number, delta: number): void {
    this.player.update(delta);
  }

  /** Creates static-body rectangles from plain data and returns their bodies. */
  private buildPlatforms(rects: PlatformRect[], color: number): Phaser.GameObjects.Rectangle[] {
    return rects.map((r) => {
      const rect = this.add.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, color);
      rect.setStrokeStyle(2, 0xffffff, 0.25);
      this.physics.add.existing(rect, true);
      return rect;
    });
  }

  /** Hand-built M1 layout (single layer) — enough to exercise movement & jumps. */
  private m1Platforms(): PlatformRect[] {
    const { levelWidth, levelHeight } = GameConfig.world;
    return [
      { x: 0, y: levelHeight - 48, w: levelWidth, h: 48 }, // ground
      { x: 360, y: levelHeight - 170, w: 200, h: 24 },
      { x: 660, y: levelHeight - 280, w: 180, h: 24 },
      { x: 980, y: levelHeight - 200, w: 160, h: 24 },
      { x: 1260, y: levelHeight - 320, w: 220, h: 24 },
      { x: 1620, y: levelHeight - 210, w: 180, h: 24 },
      { x: 1980, y: levelHeight - 300, w: 260, h: 24 },
    ];
  }
}
