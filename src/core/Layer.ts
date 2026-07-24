import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import type { LayerPresentation, RectLike } from './layerMath';

/**
 * Eine Spiel-Ebene: kanonische Physik-Geometrie (StaticGroup, unskaliert in
 * Weltkoordinaten) + Präsentations-Container (Scale/Offset/Tint/Depth).
 * Physik-Bodies folgen Container-Transforms NICHT — deshalb sind die Bodies
 * unsichtbar und nur die visuellen Zwillinge hängen im Container.
 */
export class Layer {
  readonly index: number;
  readonly platforms: Phaser.Physics.Arcade.StaticGroup;
  readonly container: Phaser.GameObjects.Container;
  private readonly platformVisuals: Phaser.GameObjects.Image[] = [];
  private readonly baseColor: number;
  private lastDarken = -1;

  constructor(scene: Phaser.Scene, index: number) {
    this.index = index;
    this.platforms = scene.physics.add.staticGroup();
    this.container = scene.add.container(0, 0);
    this.baseColor = GAME_CONFIG.layerColors[index]?.platform ?? 0xffffff;
  }

  /** Plattform in kanonischen Koordinaten: unsichtbarer Body + sichtbarer Zwilling. */
  addPlatform(scene: Phaser.Scene, x: number, y: number, width: number, height = 32): void {
    const body = this.platforms.create(x, y, 'block') as Phaser.Physics.Arcade.Image;
    body.setOrigin(0, 0);
    body.setDisplaySize(width, height);
    body.refreshBody();
    body.setVisible(false);

    const visual = scene.add.image(x, y, 'block');
    visual.setOrigin(0, 0);
    visual.setDisplaySize(width, height);
    visual.setTint(this.baseColor);
    this.container.add(visual);
    this.platformVisuals.push(visual);
  }

  /** Sichtbarer Marker für eine Switch-Zone (ab M3). */
  addZoneMarker(scene: Phaser.Scene, rect: RectLike): void {
    const marker = scene.add.rectangle(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width,
      rect.height,
      0xffffff,
      0.08,
    );
    marker.setStrokeStyle(2, 0xffffff, 0.35);
    const label = scene.add
      .text(rect.x + rect.width / 2, rect.y + 14, '⇅', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0.7);
    this.container.add([marker, label]);
  }

  /**
   * Wendet die berechnete Präsentation an. `pivot` ist der kanonische Punkt,
   * um den skaliert wird (Container-Position = pivot * (1 - scale) + Offset).
   */
  applyPresentation(p: LayerPresentation, pivot: { x: number; y: number }): void {
    this.container.setScale(p.scale);
    this.container.setPosition(pivot.x * (1 - p.scale), pivot.y * (1 - p.scale) + p.yOffset);
    this.container.setAlpha(p.alpha);
    this.container.setDepth(p.depth);

    // Tint nur neu berechnen, wenn sich die Abdunkelung sichtbar ändert.
    const darken = Math.round(p.darken * 100);
    if (darken !== this.lastDarken) {
      this.lastDarken = darken;
      const color = Phaser.Display.Color.ValueToColor(this.baseColor).darken(darken).color;
      for (const v of this.platformVisuals) v.setTint(color);
    }
  }
}
