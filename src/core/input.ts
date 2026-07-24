import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import type { MoveInput } from './movement';

/** Zusammengeführter Input-Zustand aus Tastatur und Touch-Buttons. */
export interface InputSample {
  move: MoveInput;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
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

  private touchLeft = false;
  private touchRight = false;
  private touchJump = false;
  private touchJumpWasDown = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      this.leftKeys = GAME_CONFIG.keys.left.map((k) => kb.addKey(k));
      this.rightKeys = GAME_CONFIG.keys.right.map((k) => kb.addKey(k));
      this.jumpKeys = GAME_CONFIG.keys.jump.map((k) => kb.addKey(k));
    }
    this.bindTouchButton('tc-left', (down) => (this.touchLeft = down));
    this.bindTouchButton('tc-right', (down) => (this.touchRight = down));
    this.bindTouchButton('tc-jump', (down) => (this.touchJump = down));
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

    return {
      move,
      jumpHeld: this.touchJump || this.jumpKeys.some((k) => k.isDown),
      jumpJustPressed: keyJumpJust || touchJumpJust,
    };
  }
}
