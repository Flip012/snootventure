import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import type { MoveInput } from './movement';

/** Zusammengeführter Input-Zustand aus Tastatur und Touch-Buttons. */
export interface InputSample {
  move: MoveInput;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
  /** Ebene nach hinten (W/↑ bzw. Touch ⇧) — nur als Edge. */
  layerUpJustPressed: boolean;
  /** Ebene nach vorn (S/↓ bzw. Touch ⇩) — nur als Edge. */
  layerDownJustPressed: boolean;
}

/**
 * Bündelt Keyboard-Keys und die DOM-Touch-Buttons (index.html) zu einem
 * einzigen InputSample pro Frame. Touch-JustPressed wird als Edge über
 * den letzten Frame erkannt.
 */
export class PlayerInput {
  private leftKeys: Phaser.Input.Keyboard.Key[] = [];
  private rightKeys: Phaser.Input.Keyboard.Key[] = [];
  private jumpKeys: Phaser.Input.Keyboard.Key[] = [];
  private layerUpKeys: Phaser.Input.Keyboard.Key[] = [];
  private layerDownKeys: Phaser.Input.Keyboard.Key[] = [];

  private touchLeft = false;
  private touchRight = false;
  private touchJump = false;
  private touchJumpWasDown = false;
  private touchLayerUp = false;
  private touchLayerUpWasDown = false;
  private touchLayerDown = false;
  private touchLayerDownWasDown = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      this.leftKeys = GAME_CONFIG.keys.left.map((k) => kb.addKey(k));
      this.rightKeys = GAME_CONFIG.keys.right.map((k) => kb.addKey(k));
      this.jumpKeys = GAME_CONFIG.keys.jump.map((k) => kb.addKey(k));
      this.layerUpKeys = GAME_CONFIG.keys.layerUp.map((k) => kb.addKey(k));
      this.layerDownKeys = GAME_CONFIG.keys.layerDown.map((k) => kb.addKey(k));
    }
    this.bindTouchButton('tc-left', (down) => (this.touchLeft = down));
    this.bindTouchButton('tc-right', (down) => (this.touchRight = down));
    this.bindTouchButton('tc-jump', (down) => (this.touchJump = down));
    this.bindTouchButton('tc-layer-up', (down) => (this.touchLayerUp = down));
    this.bindTouchButton('tc-layer-down', (down) => (this.touchLayerDown = down));
  }

  private bindTouchButton(id: string, set: (down: boolean) => void): void {
    const el = document.getElementById(id);
    if (!el) return;
    const down = (ev: Event): void => {
      ev.preventDefault();
      set(true);
    };
    const up = (ev: Event): void => {
      ev.preventDefault();
      set(false);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }

  sample(): InputSample {
    const leftDown = this.touchLeft || this.leftKeys.some((k) => k.isDown);
    const rightDown = this.touchRight || this.rightKeys.some((k) => k.isDown);
    let move: MoveInput = 0;
    if (leftDown && !rightDown) move = -1;
    else if (rightDown && !leftDown) move = 1;

    const keyJumpJust = this.jumpKeys.some((k) => Phaser.Input.Keyboard.JustDown(k));
    const touchJumpJust = this.touchJump && !this.touchJumpWasDown;
    this.touchJumpWasDown = this.touchJump;

    const keyLayerUpJust = this.layerUpKeys.some((k) => Phaser.Input.Keyboard.JustDown(k));
    const touchLayerUpJust = this.touchLayerUp && !this.touchLayerUpWasDown;
    this.touchLayerUpWasDown = this.touchLayerUp;

    const keyLayerDownJust = this.layerDownKeys.some((k) => Phaser.Input.Keyboard.JustDown(k));
    const touchLayerDownJust = this.touchLayerDown && !this.touchLayerDownWasDown;
    this.touchLayerDownWasDown = this.touchLayerDown;

    return {
      move,
      jumpHeld: this.touchJump || this.jumpKeys.some((k) => k.isDown),
      jumpJustPressed: keyJumpJust || touchJumpJust,
      layerUpJustPressed: keyLayerUpJust || touchLayerUpJust,
      layerDownJustPressed: keyLayerDownJust || touchLayerDownJust,
    };
  }
}
