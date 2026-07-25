import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import type { LampDef } from '../config/testLevel';
import type { Layer } from './Layer';
import { bobPosition, pendulumAngle, shadowFrom } from './lightMath';
import type { Player } from '../entities/Player';

interface LampRuntime {
  readonly layer: Layer;
  readonly def: LampDef;
  /** Sub-Container an der Aufhängung — Rotation lässt Seil + Lampe schwingen. */
  readonly swingNode: Phaser.GameObjects.Container;
  /** Leuchtkorona, additiv über der Dunkelheits-Maske. */
  readonly glow: Phaser.GameObjects.Image;
}

/**
 * Noir-Beleuchtung: Eine bildschirmfüllende Dunkelheits-Maske (RenderTexture)
 * wird pro Frame gefüllt und an jeder Lampenposition mit einem radialen
 * Licht-Gradient wieder "aufgestanzt" (ERASE). Schwingende Lampen folgen der
 * puren Pendel-Mathematik aus lightMath.ts; der Spieler wirft pro Lampe auf
 * seiner Ebene einen weichen Boden-Schatten, der von der Lichtquelle
 * wegwandert. Die Augen des Players liegen ÜBER der Maske — im Dunkeln
 * bleiben nur sie sichtbar.
 *
 * Depth-Schichten: Ebenen-Container (-2..2) < Schatten (5) < Maske (150)
 * < Koronen (160) < Augen (210) < HUD (300).
 */
export class LightingSystem {
  private readonly scene: Phaser.Scene;
  private readonly darkness: Phaser.GameObjects.RenderTexture;
  /** Wiederverwendete, nicht gerenderte Stanz-Vorlage für ERASE. */
  private readonly stamp: Phaser.GameObjects.Image;
  private readonly eyes: Phaser.GameObjects.Image;
  private readonly lamps: LampRuntime[] = [];
  private readonly shadowPool: Phaser.GameObjects.Image[] = [];
  private readonly marginX: number;
  private readonly marginY: number;

  /** Interne Masken-Auflösung (siehe GameConfig.lighting.maskResolution). */
  private readonly res: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { viewWidth, viewHeight, lighting } = GAME_CONFIG;
    this.marginX = Math.round(viewWidth * lighting.overlayMargin);
    this.marginY = Math.round(viewHeight * lighting.overlayMargin);
    this.res = lighting.maskResolution;

    // Maske intern in reduzierter Auflösung, hochskaliert auf Displaygröße.
    const fullW = viewWidth + 2 * this.marginX;
    const fullH = viewHeight + 2 * this.marginY;
    this.darkness = scene.add
      .renderTexture(0, 0, Math.ceil(fullW * this.res), Math.ceil(fullH * this.res))
      .setOrigin(0, 0)
      .setPosition(-this.marginX, -this.marginY)
      .setDisplaySize(fullW, fullH)
      .setScrollFactor(0)
      .setDepth(150);

    // Nicht auf der Display-List (wird nie direkt gerendert), aber sichtbar —
    // erase() überspringt unsichtbare Objekte. Dient nur als ERASE-Stanze.
    this.stamp = scene.add.image(0, 0, 'light');
    this.stamp.removeFromDisplayList();

    this.eyes = scene.add.image(0, 0, 'eyes').setDepth(210);
  }

  addLamp(layer: Layer, def: LampDef): void {
    const { lighting } = GAME_CONFIG;
    const swingNode = this.scene.add.container(def.x, def.y);
    const mount = this.scene.add.rectangle(0, -2, 10, 6, 0x565656);
    const rope = this.scene.add.rectangle(0, def.length / 2, 2, def.length, lighting.ropeColor);
    const bulb = this.scene.add.circle(0, def.length, 7, lighting.bulbColor);
    swingNode.add([mount, rope, bulb]);
    layer.container.add(swingNode);

    const glow = this.scene.add
      .image(def.x, def.y + def.length, 'light')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(lighting.glowAlpha)
      .setDepth(160);

    this.lamps.push({ layer, def, swingNode, glow });
  }

  /**
   * Pro Frame: Maske neu füllen, Licht pro Lampe stanzen, Koronen/Schatten/
   * Augen nachführen. Läuft auch während der Transition (Lampen kleben an
   * ihren Ebenen-Containern); nur die Schatten pausieren dann.
   */
  update(
    timeMs: number,
    camera: Phaser.Cameras.Scene2D.Camera,
    player: Player,
    isTransitioning: boolean,
  ): void {
    const { viewWidth, viewHeight, lighting } = GAME_CONFIG;
    this.darkness.clear();
    this.darkness.fill(0x000000, lighting.overlayAlpha);

    let shadowSlot = 0;

    for (const lamp of this.lamps) {
      const angle = lamp.def.swing ? pendulumAngle(timeMs, lamp.def.swing) : 0;
      // Phaser-Rotation ist im Screen-Raum (y nach unten) im Uhrzeigersinn:
      // +angle würde das Seil nach LINKS schwingen, bobPosition rechnet
      // +angle = rechts. Negieren, damit Lampe und Lichtkegel synchron sind.
      lamp.swingNode.setRotation(-angle);

      // Kanonische Lampenkörper-Position → Welt via Container-Transform
      // (Container sind nie rotiert: Welt = Pos + Scale * kanonisch).
      const bob = bobPosition(lamp.def.x, lamp.def.y, lamp.def.length, angle);
      const c = lamp.layer.container;
      const wx = c.x + c.scaleX * bob.x;
      const wy = c.y + c.scaleY * bob.y;

      // Lampen weiter hinten leuchten schwächer — Faktor direkt aus dem
      // Container-Scale abgeleitet (aktiv = 1, pro Ebene dahinter deutlich weniger).
      const depthFactor = Math.max(0, Math.min(1, 1 - (1 - c.scaleX) * lighting.depthDimming));
      // Front-Ebene: über alpha ausgeblendet; lightStrength dimmt global.
      const strength = c.alpha * depthFactor * lighting.lightStrength;

      // Licht aus der Maske stanzen. Maske ist scrollFactor 0 und wird vom
      // Kamera-Zoom mitskaliert → lokale Koordinaten relativ zum Kamerazentrum,
      // umgerechnet in die reduzierte Masken-Auflösung.
      const size = lamp.def.radius * 2 * c.scaleX * this.res;
      // Kegel-Zentrum unterhalb der Birne (Lampenschirm strahlt nach unten).
      const cyWorld = wy + lamp.def.radius * lighting.lightCenterOffset * c.scaleX;
      const px = (wx - camera.worldView.centerX + viewWidth / 2 + this.marginX) * this.res;
      const py = (cyWorld - camera.worldView.centerY + viewHeight / 2 + this.marginY) * this.res;
      this.stamp.setDisplaySize(size, size);
      this.stamp.setAlpha(strength);
      this.darkness.erase(this.stamp, px, py);

      // Leuchtkorona um den Lampenkörper (Weltgröße, unabhängig von res).
      const glowSize = lamp.def.radius * 2 * c.scaleX * lighting.glowScale;
      lamp.glow
        .setPosition(wx, wy)
        .setDisplaySize(glowSize, glowSize)
        .setAlpha(lighting.glowAlpha * strength);

      // Spieler-Schatten: nur Lampen der aktuellen Player-Ebene, kanonisch.
      if (!isTransitioning && lamp.layer.index === player.layerIndex) {
        const body = player.body();
        const params = shadowFrom(
          bob.x,
          bob.y,
          player.carrier.x,
          player.carrier.y,
          lamp.def.radius,
          lighting.shadowMaxAlpha,
        );
        if (params) {
          const shadow = this.obtainShadow(shadowSlot++);
          shadow
            .setPosition(player.carrier.x + params.offsetX, body.bottom - 2)
            .setDisplaySize(lighting.shadowBaseWidth * params.stretch, lighting.shadowHeight)
            .setAlpha(params.alpha)
            .setVisible(true);
        }
      }
    }

    // Phaser 4 puffert RenderTexture-Zeichenbefehle — erst render() führt
    // clear/fill/erase wirklich aus.
    this.darkness.render();

    for (let i = shadowSlot; i < this.shadowPool.length; i++) {
      this.shadowPool[i]?.setVisible(false);
    }

    // Augen folgen dem Display (inkl. Container-Transform während Transition).
    const playerC = player.display.parentContainer;
    const sx = playerC ? playerC.scaleX : 1;
    const baseX = playerC ? playerC.x + sx * player.display.x : player.display.x;
    const baseY = playerC ? playerC.y + sx * player.display.y : player.display.y;
    const facing = player.display.flipX ? -1 : 1;
    this.eyes
      .setPosition(baseX + facing * 3 * sx, baseY - 9 * sx)
      .setScale(sx)
      .setFlipX(player.display.flipX)
      .setAlpha(playerC ? playerC.alpha : 1);
  }

  private obtainShadow(slot: number): Phaser.GameObjects.Image {
    let shadow = this.shadowPool[slot];
    if (!shadow) {
      shadow = this.scene.add.image(0, 0, 'shadow').setDepth(5);
      this.shadowPool[slot] = shadow;
    }
    return shadow;
  }
}
