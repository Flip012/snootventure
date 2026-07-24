import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import { PlayerInput } from '../core/input';
import { Player } from '../entities/Player';

/**
 * M1: Eine einzelne Ebene mit Boden + Plattformen und dem Player.
 * Ab M2 wandert die Plattform-Erzeugung in Layer/LayerManager
 * (kanonische StaticGroups + Präsentations-Container).
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private playerInput!: PlayerInput;

  constructor() {
    super('Game');
  }

  create(): void {
    const { worldWidth, worldHeight } = GAME_CONFIG;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor(0x181c26);

    const platforms = this.buildPlatforms();

    this.player = new Player(this, 120, worldHeight - 120);
    this.physics.add.collider(this.player.sprite, platforms);

    this.playerInput = new PlayerInput(this);

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);

    this.add
      .text(16, 16, 'A/D bzw. ←/→ laufen · Space springen (variabel)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#9aa4b5',
      })
      .setScrollFactor(0);
  }

  private buildPlatforms(): Phaser.Physics.Arcade.StaticGroup {
    const { worldWidth, worldHeight } = GAME_CONFIG;
    const color = GAME_CONFIG.layerColors[0].platform;
    const group = this.physics.add.staticGroup();

    const addPlatform = (x: number, y: number, width: number, height = 32): void => {
      const img = group.create(x, y, 'block') as Phaser.Physics.Arcade.Image;
      img.setOrigin(0, 0);
      img.setDisplaySize(width, height);
      img.setTint(color);
      img.refreshBody();
    };

    // Durchgehender Boden
    addPlatform(0, worldHeight - 48, worldWidth, 48);
    // Ein paar Plattformen zum Testen von Sprunghöhe/Coyote/Buffer
    addPlatform(360, worldHeight - 168, 192);
    addPlatform(680, worldHeight - 268, 160);
    addPlatform(980, worldHeight - 200, 128);
    addPlatform(1280, worldHeight - 320, 192);
    addPlatform(1660, worldHeight - 220, 160);
    addPlatform(1980, worldHeight - 360, 224);

    return group;
  }

  override update(time: number, delta: number): void {
    this.player.update(time, delta, this.playerInput.sample());
  }
}
