import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import type { Dog } from '../entities/Dog';
import type { Player } from '../entities/Player';

export interface DebugState {
  readonly activeLayer: number;
  readonly layerCount: number;
  readonly transitioning: boolean;
  readonly leashDistance: number;
  readonly leashTaut: boolean;
  readonly inZone: boolean;
  /** Aktuelles Interesse des Hundes an seiner Zielstelle (0..1). */
  readonly spotInterest: number;
}

/**
 * Togglebares Debug-Overlay (F1): aktive Ebene, FPS, Grounded/Coyote/Buffer,
 * Positionen und Leinen-Zustand. Liegt über allem (Depth 400).
 */
export class DebugOverlay {
  private readonly scene: Phaser.Scene;
  private readonly text: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.text = scene.add
      .text(16, 44, '', {
        fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
        fontSize: '12px',
        color: '#8ef58e',
        backgroundColor: '#000000cc',
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(400)
      .setVisible(false);

    scene.input.keyboard?.addKey(GAME_CONFIG.debugKey).on('down', () => this.toggle());
  }

  toggle(): void {
    this.visible = !this.visible;
    this.text.setVisible(this.visible);
  }

  update(player: Player, dog: Dog, state: DebugState): void {
    if (!this.visible) return;

    const pb = player.body();
    const db = dog.body();
    const round = (v: number): number => Math.round(v);

    this.text.setText(
      [
        `FPS        ${round(this.scene.game.loop.actualFps)}`,
        `Ebene      ${state.activeLayer + 1}/${state.layerCount}${
          state.transitioning ? '  (Transition)' : ''
        }`,
        `Zone       ${state.inZone ? 'ja — W/S wechselt' : 'nein'}`,
        '',
        `Mensch     x ${round(player.carrier.x)}  y ${round(player.carrier.y)}`,
        `  v        ${round(pb.velocity.x)} / ${round(pb.velocity.y)}`,
        `  grounded ${player.isGrounded() ? 'ja' : 'nein'}` +
          `   coyote ${player.debugCoyoteLeftMs() > 0 ? round(player.debugCoyoteLeftMs()) + 'ms' : '—'}` +
          `   buffer ${player.debugBufferLeftMs() > 0 ? round(player.debugBufferLeftMs()) + 'ms' : '—'}`,
        '',
        `Hund       x ${round(dog.carrier.x)}  y ${round(dog.carrier.y)}  Ebene ${dog.layerIndex + 1}`,
        `  v        ${round(db.velocity.x)} / ${round(db.velocity.y)}`,
        `  Laune    ${dog.brain.mood}` +
          (dog.brain.mood === 'spot'
            ? ` #${dog.brain.targetSpot}` +
              (dog.brain.lingering ? (dog.brain.marking ? ' (markiert)' : ' (schnüffelt)') : ' (unterwegs)') +
              `  Interesse ${(state.spotInterest * 100).toFixed(0)}%`
            : ''),
        `Leine      ${round(state.leashDistance)}px  ${
          state.leashTaut ? 'STRAFF' : 'locker'
        }  (max ${GAME_CONFIG.leash.length})`,
      ].join('\n'),
    );
  }
}
