import Phaser from 'phaser';
import { GameConfig, layerColor } from '../config/GameConfig';
import type { Entity } from '../entities/Entity';
import type { LevelData } from '../level/types';
import { Layer } from './Layer';
import { computeLayerPresentation } from './layerTransform';

/**
 * Owns the depth layers, the active layer and (from M3) transitions between
 * them. Entities register with a layer: their display is parented into that
 * layer's container and a collider is set up against that layer's platform
 * bodies. Built so two entities can later sit on different layers at once —
 * colliders are tracked per entity.
 */
export class LayerManager {
  private readonly scene: Phaser.Scene;
  private readonly layers: Layer[] = [];
  private activeIndex = 0;

  /** Per-entity collider against its current layer's platforms. */
  private readonly colliders = new Map<Entity, Phaser.Physics.Arcade.Collider>();

  constructor(scene: Phaser.Scene, level: LevelData) {
    this.scene = scene;
    level.layers.forEach((data, i) => {
      this.layers.push(new Layer(scene, i, layerColor(i), data.platforms));
    });
    this.applyPresentations();
  }

  get count(): number {
    return this.layers.length;
  }

  get active(): number {
    return this.activeIndex;
  }

  private getLayer(index: number): Layer {
    const layer = this.layers[index];
    if (!layer) throw new Error(`No layer at index ${index}`);
    return layer;
  }

  /** Recompute and apply the static presentation for every layer. */
  private applyPresentations(): void {
    for (const layer of this.layers) {
      layer.applyPresentation(
        computeLayerPresentation(layer.index, this.activeIndex, GameConfig.layers),
      );
    }
  }

  /** Set the active layer instantly (M2). M3 replaces this with a tween. */
  setActiveLayer(index: number): void {
    this.activeIndex = Phaser.Math.Clamp(index, 0, this.count - 1);
    this.applyPresentations();
  }

  /** Register an entity on a layer: parent its display + collide with that layer. */
  registerEntity(entity: Entity, layerIndex: number): void {
    const layer = this.getLayer(layerIndex);
    for (const underlay of entity.underlays) layer.addDisplay(underlay);
    layer.addDisplay(entity.display);
    entity.setLayerIndex(layerIndex);
    this.colliders.set(entity, this.scene.physics.add.collider(entity.physics, layer.platformBodies));
  }

  /** Per-frame: pivot every layer around the current camera view centre. */
  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    const pivotX = camera.worldView.centerX;
    const pivotY = camera.worldView.centerY;
    for (const layer of this.layers) layer.updatePivot(pivotX, pivotY);
  }
}
