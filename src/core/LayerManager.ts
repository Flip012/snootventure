import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import type { Entity } from './Entity';
import { Layer } from './Layer';
import { computeLayerPresentation, TransitionGuard } from './layerMath';

/**
 * Verwaltet die Ebenen, die aktive Ebene und die getweente Transition.
 * Während einer Transition sind weitere Wechsel geblockt (Guard) und die
 * Entity ist physikalisch eingefroren.
 */
export class LayerManager {
  readonly layers: Layer[] = [];
  activeIndex = 0;

  private readonly scene: Phaser.Scene;
  private readonly pivot: { x: number; y: number };
  private readonly guard = new TransitionGuard();

  constructor(scene: Phaser.Scene, pivot: { x: number; y: number }) {
    this.scene = scene;
    this.pivot = pivot;
  }

  createLayer(): Layer {
    const layer = new Layer(this.scene, this.layers.length);
    this.layers.push(layer);
    return layer;
  }

  get isTransitioning(): boolean {
    return this.guard.active;
  }

  /**
   * Wendet die Diorama-Präsentation für einen (auch fraktionalen) aktiven
   * Index an — während der Transition wird dieser kontinuierlich interpoliert.
   */
  applyPresentation(activeFloat: number): void {
    for (const layer of this.layers) {
      layer.applyPresentation(
        computeLayerPresentation(layer.index - activeFloat, GAME_CONFIG),
        this.pivot,
      );
    }
  }

  /**
   * Startet die getweente Transition zur Ziel-Ebene. Liefert false, wenn das
   * Ziel ungültig ist oder bereits eine Transition läuft. Die kanonische
   * Position der Entity bleibt erhalten — hat die Zielebene dort keine
   * Plattform, fällt sie nach dem Unfreeze (bewusst erlaubt).
   */
  switchTo(
    target: number,
    entity: Entity,
    camera?: Phaser.Cameras.Scene2D.Camera,
    onComplete?: () => void,
  ): boolean {
    const targetLayer = this.layers[target];
    if (!targetLayer || target === this.activeIndex) return false;
    if (!this.guard.begin()) return false;

    const from = this.activeIndex;
    const dist = Math.abs(target - from);

    entity.freeze();
    // Sofort umhängen: Display + Collider gehören ab jetzt zur Zielebene.
    entity.attachToLayer(targetLayer);

    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: GAME_CONFIG.transitionDurationMs,
      ease: GAME_CONFIG.transitionEasing,
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        this.applyPresentation(from + (target - from) * t);
        camera?.setZoom(1 - GAME_CONFIG.cameraZoomPerDepth * dist * Math.sin(Math.PI * t));
      },
      onComplete: () => {
        this.activeIndex = target;
        this.applyPresentation(target);
        camera?.setZoom(1);
        entity.unfreeze();
        this.guard.end();
        onComplete?.();
      },
    });
    return true;
  }
}
