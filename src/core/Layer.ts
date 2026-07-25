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
  addPlatform(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number = GAME_CONFIG.platformThickness,
  ): void {
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

  /**
   * Bewuchs/Mobiliar in kanonischen Koordinaten — rein visuell (keine
   * Kollision), aber für den Hund eine Schnüffelstelle. Steht mit der
   * Unterkante auf dem angegebenen Punkt.
   */
  addProp(scene: Phaser.Scene, textureKey: string, x: number, y: number): void {
    const prop = scene.add.image(x, y, textureKey);
    prop.setOrigin(0.5, 1);
    // Etwas dunkler als die Plattformen, damit die Silhouetten sich absetzen.
    prop.setTint(Phaser.Display.Color.ValueToColor(this.baseColor).darken(25).color);
    this.container.add(prop);
  }

  /**
   * Sichtbarer Marker für eine Switch-Zone. Das Label zeigt genau die von
   * DIESER Ebene aus möglichen Richtungen: ▲ = eine Ebene nach hinten (W/↑),
   * ▼ = eine nach vorn (S/↓). Nur wo beides geht, stehen beide Pfeile.
   */
  addZoneMarker(scene: Phaser.Scene, rect: RectLike, connectedLayers: readonly number[]): void {
    const canGoBack = connectedLayers.includes(this.index + 1);
    const canGoFront = connectedLayers.includes(this.index - 1);
    if (!canGoBack && !canGoFront) return;

    const marker = scene.add.rectangle(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width,
      rect.height,
      0xffffff,
      0.08,
    );
    marker.setStrokeStyle(2, 0xffffff, 0.35);

    const glyph = canGoBack && canGoFront ? '▲\n▼' : canGoBack ? '▲' : '▼';
    const label = scene.add
      .text(rect.x + rect.width / 2, rect.y + 20, glyph, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: -4,
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0.75);

    // Klartext darunter, damit die Richtung eindeutig ist
    const hint = scene.add
      .text(
        rect.x + rect.width / 2,
        rect.y + (canGoBack && canGoFront ? 54 : 42),
        canGoBack && canGoFront ? 'W hinten\nS vorn' : canGoBack ? 'W hinten' : 'S vorn',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '10px',
          color: '#ffffff',
          align: 'center',
        },
      )
      .setOrigin(0.5, 0.5)
      .setAlpha(0.5);

    this.container.add([marker, label, hint]);
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
