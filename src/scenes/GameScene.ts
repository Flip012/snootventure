import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import { TEST_LEVEL, TEST_ZONES } from '../config/testLevel';
import { PlayerInput } from '../core/input';
import { zoneAllowsSwitch } from '../core/layerMath';
import { LayerManager } from '../core/LayerManager';
import { Player } from '../entities/Player';

/**
 * M3: Drei Diorama-Ebenen mit sichtbaren Switch-Zonen. W/↑ wechselt eine
 * Ebene nach hinten, S/↓ nach vorn — nur bei Body-Overlap mit einer Zone,
 * die beide Ebenen verbindet. Während der Transition ist die Physik des
 * Players eingefroren und weitere Wechsel sind geblockt.
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private playerInput!: PlayerInput;
  private layerManager!: LayerManager;
  private hud!: Phaser.GameObjects.Text;

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

    // Zonen-Marker auf jeder Ebene rendern, die die Zone verbindet.
    for (const zone of TEST_ZONES) {
      for (const layerIndex of zone.layers) {
        this.layerManager.layers[layerIndex]?.addZoneMarker(this, zone.rect);
      }
    }

    this.player = new Player(this, GAME_CONFIG.spawn.x, GAME_CONFIG.spawn.y);
    const startLayer = this.layerManager.layers[0];
    if (startLayer) this.player.attachToLayer(startLayer);

    this.layerManager.applyPresentation(this.layerManager.activeIndex);

    this.playerInput = new PlayerInput(this);

    // Kamera folgt dem kanonischen Carrier (Weltkoordinaten, nie skaliert).
    this.cameras.main.startFollow(this.player.carrier, true, 0.12, 0.12);

    this.hud = this.add
      .text(16, 16, '', {
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
      if (input.layerUpJustPressed) this.tryLayerSwitch(1);
      else if (input.layerDownJustPressed) this.tryLayerSwitch(-1);
      this.respawnIfFallen();
    }

    this.player.syncDisplay();

    this.hud.setText(
      `Ebene ${this.layerManager.activeIndex + 1}/${this.layerManager.layers.length}` +
        '  ·  A/D laufen · Space springen · W/S Ebene wechseln (in ⇅-Zonen)',
    );
  }

  /**
   * Fällt der Player durch (Ebene ohne Plattform → Aufprall auf dem
   * Weltboden), wird er auf den Spawn-Punkt der aktuellen Ebene gesetzt.
   */
  private respawnIfFallen(): void {
    const body = this.player.body();
    if (body.bottom >= GAME_CONFIG.worldHeight - 1) {
      // body.reset() setzt GameObject UND Body konsistent um.
      body.reset(GAME_CONFIG.spawn.x, GAME_CONFIG.spawn.y);
    }
  }

  /** dir = +1: nach hinten (W/↑), dir = -1: nach vorn (S/↓). */
  private tryLayerSwitch(dir: 1 | -1): void {
    const from = this.player.layerIndex;
    const to = from + dir;
    const body = this.player.body();
    const bodyRect = { x: body.x, y: body.y, width: body.width, height: body.height };

    const eligible = TEST_ZONES.some((zone) => zoneAllowsSwitch(zone, bodyRect, from, to));
    if (eligible) {
      this.layerManager.switchTo(to, this.player, this.cameras.main);
    }
  }
}
