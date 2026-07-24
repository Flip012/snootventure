import Phaser from 'phaser';
import type { Layer } from './Layer';

/**
 * Body/Display-Split: unsichtbarer Physics-Carrier in kanonischen
 * Weltkoordinaten + Display-Sprite als Kind des jeweiligen Layer-Containers.
 * Pro Frame übernimmt syncDisplay() die lokale Sprite-Position aus dem Body;
 * der Container-Transform erzeugt automatisch die Bildschirmposition.
 * Auf der aktiven Ebene (Scale 1, Offset 0) fallen Body und Sprite exakt
 * zusammen. Dieses Modell trägt später zwei Entities (Mensch + Hund).
 */
export class Entity {
  protected readonly scene: Phaser.Scene;
  /** Unsichtbarer Physics-Sprite — die kanonische Wahrheit. */
  readonly carrier: Phaser.Physics.Arcade.Sprite;
  /** Sichtbarer Zwilling im Layer-Container. */
  readonly display: Phaser.GameObjects.Image;
  layerIndex = 0;

  private collider: Phaser.Physics.Arcade.Collider | null = null;
  private savedVelocity: { vx: number; vy: number } | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    this.scene = scene;
    this.carrier = scene.physics.add.sprite(x, y, textureKey);
    this.carrier.setVisible(false);
    this.carrier.setCollideWorldBounds(true);
    this.display = scene.add.image(x, y, textureKey);
  }

  body(): Phaser.Physics.Arcade.Body {
    return this.carrier.body as Phaser.Physics.Arcade.Body;
  }

  /**
   * Bindet die Entity an eine Ebene: Kollision strikt nur mit deren
   * StaticGroup (alter Collider wird zerstört), Display wird in den
   * Ziel-Container umgehängt. Die kanonische Position bleibt unverändert.
   */
  attachToLayer(layer: Layer): void {
    this.collider?.destroy();
    this.collider = this.scene.physics.add.collider(this.carrier, layer.platforms);
    layer.container.add(this.display); // Container.add reparented automatisch
    this.layerIndex = layer.index;
  }

  /** Physik-Freeze für die Transition: Velocity sichern, Gravity aus. */
  freeze(): void {
    const body = this.body();
    this.savedVelocity = { vx: body.velocity.x, vy: body.velocity.y };
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
  }

  /** Nach der Transition: Gravity an, gesicherte Velocity wiederherstellen. */
  unfreeze(): void {
    const body = this.body();
    body.setAllowGravity(true);
    if (this.savedVelocity) {
      body.setVelocity(this.savedVelocity.vx, this.savedVelocity.vy);
      this.savedVelocity = null;
    }
  }

  get isFrozen(): boolean {
    return this.savedVelocity !== null;
  }

  /** Pro Frame: lokale Display-Position aus dem kanonischen Body übernehmen. */
  syncDisplay(): void {
    this.display.setPosition(this.carrier.x, this.carrier.y);
  }
}
