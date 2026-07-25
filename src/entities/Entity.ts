import Phaser from 'phaser';

/**
 * Base class implementing the "physics ≠ presentation" split (see CLAUDE.md).
 *
 * - `physics` is an invisible Arcade sprite that lives in **canonical world
 *   coordinates** and is what actually collides. It is never parented to a
 *   layer container, so it is immune to Arcade's container-transform quirks.
 * - `display` is the visible sprite. It is a **child of a layer container**;
 *   each frame `syncDisplay()` copies the body's canonical position into it, and
 *   the container's transform (scale/offset) produces the diorama screen
 *   position. On the active layer (identity transform) body and display coincide.
 *
 * This is what lets two entities later live on different layers at once: each
 * simulates in canonical space, each is drawn through its own layer's transform.
 */
export abstract class Entity {
  /** Invisible physics body in canonical world coordinates. */
  readonly physics: Phaser.Physics.Arcade.Sprite;
  /** Visible sprite, reparented into the current layer's container. */
  readonly display: Phaser.GameObjects.Sprite;

  /**
   * Extra objects that belong under `display` inside the layer container (e.g.
   * the player's cast shadows). Added to the container before the display when
   * the entity registers with a layer.
   */
  readonly underlays: Phaser.GameObjects.GameObject[] = [];

  private layerIndex = -1;

  protected constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    tint: number,
  ) {
    this.physics = scene.physics.add.sprite(x, y, textureKey);
    this.physics.setVisible(false);

    this.display = scene.add.sprite(x, y, textureKey);
    this.display.setTint(tint);
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.physics.body as Phaser.Physics.Arcade.Body;
  }

  get currentLayerIndex(): number {
    return this.layerIndex;
  }

  setLayerIndex(index: number): void {
    this.layerIndex = index;
  }

  /** Copy the canonical body position into the display (its container's local space). */
  syncDisplay(): void {
    this.display.setPosition(this.physics.x, this.physics.y);
  }
}
