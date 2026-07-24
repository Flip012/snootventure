import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import { TEST_LEVEL } from '../config/testLevel';
import { PlayerInput } from '../core/input';
import { LayerManager } from '../core/LayerManager';
import { Player } from '../entities/Player';

/**
 * M2: Drei Ebenen als Diorama (Scale/Offset/Tint pro Abstand zur aktiven
 * Ebene). Der Player läuft auf Ebene 0; Wechsel folgt in M3.
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private playerInput!: PlayerInput;
  private layerManager!: LayerManager;

  constructor() {
    super('Game');
  }

  create(): void {
    const { worldWidth, worldHeight } = GAME_CONFIG;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor(0x181c26);

    // Pivot: Skalierung zentriert auf die Boden-Mitte, damit die hinteren
    // Ebenen "auf dem Boden stehend" nach hinten rücken.
    this.layerManager = new LayerManager(this, {
      x: worldWidth / 2,
      y: worldHeight - 48,
    });

    for (const layerDef of TEST_LEVEL) {
      const layer = this.layerManager.createLayer();
      for (const p of layerDef.platforms) {
        layer.addPlatform(this, p.x, p.y, p.width, p.height);
      }
    }

    this.player = new Player(this, 120, worldHeight - 120);
    const startLayer = this.layerManager.layers[0];
    if (startLayer) this.player.attachToLayer(startLayer);

    this.layerManager.applyPresentation(this.layerManager.activeIndex);

    this.playerInput = new PlayerInput(this);

    // Kamera folgt dem kanonischen Carrier (Weltkoordinaten, nie skaliert).
    this.cameras.main.startFollow(this.player.carrier, true, 0.12, 0.12);

    this.add
      .text(16, 16, 'A/D bzw. ←/→ laufen · Space springen (variabel)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#9aa4b5',
      })
      .setScrollFactor(0)
      .setDepth(100);
  }

  override update(time: number, delta: number): void {
    const input = this.playerInput.sample();
    if (!this.layerManager.isTransitioning) {
      this.player.update(time, delta, input);
    }
    this.player.syncDisplay();
  }
}
