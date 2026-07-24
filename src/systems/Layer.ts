import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import type { PlatformRect } from '../level/types';
import { mixColor, type LayerPresentation } from './layerTransform';

/**
 * One playable depth layer.
 *
 * - `container` holds the layer's **visuals** (platform rectangles, and — once
 *   registered — entity displays) at canonical local coordinates. Its transform
 *   is set purely for presentation (diorama).
 * - `platformBodies` are invisible static-body rectangles in **canonical world
 *   coordinates**. They are what entities on this layer collide with. They are
 *   deliberately NOT children of the container, so collisions are unaffected by
 *   the visual scale/offset.
 */
export class Layer {
  readonly index: number;
  readonly color: number;
  readonly container: Phaser.GameObjects.Container;
  readonly platformBodies: Phaser.GameObjects.Rectangle[] = [];

  private readonly platformVisuals: Phaser.GameObjects.Rectangle[] = [];
  private presentation: LayerPresentation = {
    scale: 1,
    yOffset: 0,
    alpha: 1,
    darken: 0,
    depth: 0,
    hidden: false,
  };

  constructor(scene: Phaser.Scene, index: number, color: number, platforms: PlatformRect[]) {
    this.index = index;
    this.color = color;
    this.container = scene.add.container(0, 0);
    for (const p of platforms) this.addPlatform(scene, p);
  }

  private addPlatform(scene: Phaser.Scene, p: PlatformRect): void {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;

    // Visual: child of the container, canonical local coordinates.
    const visual = scene.add.rectangle(cx, cy, p.w, p.h, this.color);
    visual.setStrokeStyle(2, 0xffffff, 0.18);
    this.container.add(visual);
    this.platformVisuals.push(visual);

    // Physics: invisible static body in canonical world coordinates.
    const bodyRect = scene.add.rectangle(cx, cy, p.w, p.h);
    bodyRect.setVisible(false);
    scene.physics.add.existing(bodyRect, true);
    this.platformBodies.push(bodyRect);
  }

  /** Add an entity's display to this layer's visual container. */
  addDisplay(display: Phaser.GameObjects.GameObject): void {
    this.container.add(display);
  }

  removeDisplay(display: Phaser.GameObjects.GameObject): void {
    this.container.remove(display);
  }

  /** Apply the depth-dependent static presentation (scale, alpha, depth, colour). */
  applyPresentation(pres: LayerPresentation): void {
    this.presentation = pres;
    this.container.setScale(pres.scale);
    this.container.setDepth(pres.depth);
    this.container.setAlpha(pres.alpha);
    this.container.setVisible(!pres.hidden || pres.alpha > 0.001);

    const tinted = mixColor(this.color, GameConfig.layers.depthFogColor, pres.darken);
    for (const v of this.platformVisuals) v.setFillStyle(tinted);
  }

  /**
   * Position the container so its scaling pivots around the camera view centre,
   * giving a correct, parallax-consistent diorama. Called each frame with the
   * current camera world-centre. For the active layer (scale 1) this resolves to
   * an identity transform, so canonical == screen.
   */
  updatePivot(pivotX: number, pivotY: number): void {
    const s = this.presentation.scale;
    this.container.x = pivotX * (1 - s);
    this.container.y = pivotY * (1 - s) + this.presentation.yOffset;
  }
}
