import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Player } from '../entities/Player';
import { prototypeLevel } from '../level/prototypeLevel';
import { LayerManager } from '../systems/LayerManager';
import { LightingSystem } from '../systems/LightingSystem';
import { TouchControls, type TouchInput } from '../systems/TouchControls';

/**
 * M2 scene: three depth layers rendered as a diorama via the LayerManager, with
 * the player registered on the front layer. Physics stays canonical; only the
 * presentation is transformed. Switch points / transitions come in M3.
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private layers!: LayerManager;
  private lighting!: LightingSystem;
  private debugText!: Phaser.GameObjects.Text;

  constructor() {
    super('game');
  }

  create(): void {
    const { levelWidth, levelHeight } = GameConfig.world;
    this.physics.world.setBounds(0, 0, levelWidth, levelHeight);
    this.cameras.main.setBounds(0, 0, levelWidth, levelHeight);
    this.cameras.main.setBackgroundColor(GameConfig.world.backgroundColor);

    this.layers = new LayerManager(this, prototypeLevel);

    // Touch controls only on touch devices; keyboard stays available on desktop.
    const touch: TouchInput | null = this.sys.game.device.input.touch
      ? new TouchControls(this)
      : null;

    const spawn = prototypeLevel.spawn;
    this.player = new Player(this, spawn.x, spawn.y, touch);
    this.layers.registerEntity(this.player, spawn.layerIndex);

    // Camera follows the invisible canonical body → transform-independent.
    this.cameras.main.startFollow(this.player.physics, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(120, 80);

    // Lamps live on the active (playable) layer; they light the scene.
    const activeLamps = prototypeLevel.layers[spawn.layerIndex]?.lamps ?? [];
    this.lighting = new LightingSystem(this, activeLamps, this.player);

    this.debugText = this.add
      .text(8, 8, '', { fontFamily: 'monospace', fontSize: '14px', color: '#e6e9ef' })
      .setScrollFactor(0)
      .setDepth(1000);

    // Pivot the layers once so the first rendered frame is already correct.
    this.layers.update(this.cameras.main);
  }

  override update(time: number, delta: number): void {
    this.player.update(delta);
    this.layers.update(this.cameras.main);
    this.lighting.update(time, this.cameras.main);

    const s = this.player.getDebugState();
    this.debugText.setText(
      `Ebene ${this.layers.active + 1}/${this.layers.count}   ` +
        `FPS ${Math.round(this.game.loop.actualFps)}   ` +
        `x:${s.x} y:${s.y}   grounded:${s.grounded ? 'y' : 'n'}`,
    );
  }
}
