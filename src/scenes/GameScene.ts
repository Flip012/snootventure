import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import { GOAL, TEST_LEVEL, TEST_ZONES } from '../config/testLevel';
import { PlayerInput } from '../core/input';
import { zoneAllowsSwitch } from '../core/layerMath';
import { LayerManager } from '../core/LayerManager';
import { leashForce, leashPoints } from '../core/leash';
import { LightingSystem } from '../core/LightingSystem';
import { Dog } from '../entities/Dog';
import { Player } from '../entities/Player';
import { DebugOverlay } from '../ui/DebugOverlay';

/**
 * M4: Testlevel mit Ziel (nur über Ebene 3 erreichbar), Mensch + Hund an der
 * Leine, Noir-Beleuchtung und Debug-Overlay (F1).
 *
 * Mensch und Hund sind eigenständige Entities mit Body/Display-Split. Der Hund
 * wechselt die Ebene automatisch mit — die Architektur trüge auch getrennte
 * Ebenen, das bleibt einem späteren Rätsel-Milestone vorbehalten.
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private dog!: Dog;
  private playerInput!: PlayerInput;
  private layerManager!: LayerManager;
  private lighting!: LightingSystem;
  private debug!: DebugOverlay;
  private leashGfx!: Phaser.GameObjects.Graphics;
  private goal!: Phaser.GameObjects.Image;
  private hud!: Phaser.GameObjects.Text;
  private goalReached = false;

  constructor() {
    super('Game');
  }

  create(): void {
    const { worldWidth, worldHeight } = GAME_CONFIG;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor(0x1c1c1c);

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

    // Zonen-Marker auf jeder Ebene rendern, die die Zone verbindet — das
    // Label zeigt die von dort aus tatsächlich möglichen Richtungen.
    for (const zone of TEST_ZONES) {
      for (const layerIndex of zone.layers) {
        this.layerManager.layers[layerIndex]?.addZoneMarker(this, zone.rect, zone.layers);
      }
    }

    // Ziel-Marker als Kind der Zielebene (folgt dem Diorama-Transform).
    this.goal = this.add.image(GOAL.x, GOAL.y, 'goal').setOrigin(0, 0);
    this.layerManager.layers[GOAL.layer]?.container.add(this.goal);

    this.player = new Player(this, GAME_CONFIG.spawn.x, GAME_CONFIG.spawn.y);
    this.dog = new Dog(
      this,
      GAME_CONFIG.spawn.x + GAME_CONFIG.dog.spawnOffsetX,
      GAME_CONFIG.spawn.y,
    );
    const startLayer = this.layerManager.layers[0];
    if (startLayer) {
      this.player.attachToLayer(startLayer);
      this.dog.attachToLayer(startLayer);
    }

    // Leine zwischen Mensch und Hund — unter den Figuren, über den Plattformen.
    this.leashGfx = this.add.graphics().setDepth(4);

    // Lampen NACH den Figuren anlegen, damit sie im Container über ihnen hängen.
    this.lighting = new LightingSystem(this);
    TEST_LEVEL.forEach((layerDef, i) => {
      const layer = this.layerManager.layers[i];
      if (!layer) return;
      for (const lamp of layerDef.lamps) this.lighting.addLamp(layer, lamp);
    });
    this.lighting.trackEyes(this.player, 'eyes');
    this.lighting.trackEyes(this.dog, 'dogEyes');
    this.lighting.trackShadow(this.player, GAME_CONFIG.lighting.shadowBaseWidth);
    this.lighting.trackShadow(this.dog, GAME_CONFIG.lighting.shadowBaseWidth * 0.9);

    this.layerManager.applyPresentation(this.layerManager.activeIndex);

    this.playerInput = new PlayerInput(this);

    // Kamera folgt dem kanonischen Carrier (Weltkoordinaten, nie skaliert).
    this.cameras.main.startFollow(this.player.carrier, true, 0.12, 0.12);

    this.hud = this.add
      .text(16, 16, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#c9c9c9',
      })
      .setScrollFactor(0)
      .setDepth(300);

    this.debug = new DebugOverlay(this);
  }

  override update(time: number, delta: number): void {
    const input = this.playerInput.sample();
    const transitioning = this.layerManager.isTransitioning;

    // Leinen-Feder aus den kanonischen Positionen beider Figuren.
    const force = leashForce(
      { x: this.player.carrier.x, y: this.player.carrier.y },
      { x: this.dog.carrier.x, y: this.dog.carrier.y },
      GAME_CONFIG.leash,
    );

    if (!transitioning) {
      this.player.update(time, delta, input, force.player);
      this.dog.update(delta, this.player.carrier.x, force.dog, force.taut, force.distance);
      if (input.layerUpJustPressed) this.tryLayerSwitch(1);
      else if (input.layerDownJustPressed) this.tryLayerSwitch(-1);
      this.respawnIfFallen();
      this.checkGoal();
    }

    this.player.syncDisplay();
    this.dog.syncDisplay();
    this.drawLeash();
    this.lighting.update(time, this.cameras.main, transitioning);

    this.hud.setText(
      this.goalReached
        ? '🏁 Ziel erreicht! — R für Neustart'
        : `Ebene ${this.layerManager.activeIndex + 1}/${this.layerManager.layers.length}` +
            '  ·  A/D laufen · Space springen · W ▲ hinten / S ▼ vorn (in Zonen) · F1 Debug',
    );

    this.debug.update(this.player, this.dog, {
      activeLayer: this.layerManager.activeIndex,
      layerCount: this.layerManager.layers.length,
      transitioning,
      leashDistance: force.distance,
      leashTaut: force.taut,
      inZone: this.isInAnyZone(),
    });
  }

  /** Zeichnet die Leine: straff gerade, locker mit Durchhang. */
  private drawLeash(): void {
    const container = this.player.display.parentContainer;
    const scale = container ? container.scaleX : 1;
    const toWorld = (p: { x: number; y: number }): { x: number; y: number } =>
      container
        ? { x: container.x + scale * p.x, y: container.y + container.scaleY * p.y }
        : { x: p.x, y: p.y };

    // Hund auf anderer Ebene → keine sichtbare Leine (Rätsel-Fall für später).
    this.leashGfx.clear();
    if (this.dog.layerIndex !== this.player.layerIndex) return;

    const pts = leashPoints(
      { x: this.player.carrier.x, y: this.player.carrier.y + 6 },
      { x: this.dog.carrier.x, y: this.dog.carrier.y - 4 },
      GAME_CONFIG.leash,
      GAME_CONFIG.leash.sagPx,
    );

    this.leashGfx.lineStyle(2 * scale, GAME_CONFIG.leash.color, 0.75 * (container?.alpha ?? 1));
    this.leashGfx.beginPath();
    pts.forEach((p, i) => {
      const w = toWorld(p);
      if (i === 0) this.leashGfx.moveTo(w.x, w.y);
      else this.leashGfx.lineTo(w.x, w.y);
    });
    this.leashGfx.strokePath();
  }

  private checkGoal(): void {
    if (this.goalReached) return;
    if (this.player.layerIndex !== GOAL.layer) return;

    const body = this.player.body();
    const hit =
      body.x < GOAL.x + this.goal.width &&
      body.x + body.width > GOAL.x &&
      body.y < GOAL.y + this.goal.height &&
      body.y + body.height > GOAL.y;

    if (hit) {
      this.goalReached = true;
      this.cameras.main.flash(400, 255, 255, 255);
      this.input.keyboard?.once('keydown-R', () => this.scene.restart());
    }
  }

  /**
   * Fällt eine Figur durch (Ebene ohne Plattform → Aufprall auf dem
   * Weltboden), wird sie auf den Spawn-Punkt zurückgesetzt.
   */
  private respawnIfFallen(): void {
    const pb = this.player.body();
    if (pb.bottom >= GAME_CONFIG.worldHeight - 1) {
      // body.reset() setzt GameObject UND Body konsistent um.
      pb.reset(GAME_CONFIG.spawn.x, GAME_CONFIG.spawn.y);
    }
    const db = this.dog.body();
    if (db.bottom >= GAME_CONFIG.worldHeight - 1) {
      db.reset(this.player.carrier.x + GAME_CONFIG.dog.spawnOffsetX, this.player.carrier.y);
    }
  }

  private isInAnyZone(): boolean {
    const body = this.player.body();
    const rect = { x: body.x, y: body.y, width: body.width, height: body.height };
    const from = this.player.layerIndex;
    return TEST_ZONES.some(
      (zone) =>
        zoneAllowsSwitch(zone, rect, from, from + 1) || zoneAllowsSwitch(zone, rect, from, from - 1),
    );
  }

  /** dir = +1: nach hinten (W/↑), dir = -1: nach vorn (S/↓). */
  private tryLayerSwitch(dir: 1 | -1): void {
    const from = this.player.layerIndex;
    const to = from + dir;
    const body = this.player.body();
    const bodyRect = { x: body.x, y: body.y, width: body.width, height: body.height };

    const eligible = TEST_ZONES.some((zone) => zoneAllowsSwitch(zone, bodyRect, from, to));
    if (!eligible) return;

    const targetLayer = this.layerManager.layers[to];
    if (!targetLayer) return;

    // Der Hund wechselt mit: Er wird zusammen mit dem Player eingefroren und
    // beim Abschluss der Transition auf der Zielebene re-aktiviert.
    this.dog.freeze();
    const started = this.layerManager.switchTo(to, this.player, this.cameras.main, () => {
      this.dog.attachToLayer(targetLayer);
      this.dog.unfreeze();
    });
    if (!started) this.dog.unfreeze();
  }
}
