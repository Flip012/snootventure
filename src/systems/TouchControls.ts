import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

/** What the Player reads — merged with the keyboard so both input paths work. */
export interface TouchInput {
  readonly leftDown: boolean;
  readonly rightDown: boolean;
  /** Returns true once per press (edge), then clears. */
  pollJumpPressed(): boolean;
  /** Returns true once per release (edge), then clears. */
  pollJumpReleased(): boolean;
}

interface HoldButton {
  arc: Phaser.GameObjects.Arc;
}

/**
 * On-screen touch controls: hold ◀ / ▶ to run, tap ▲ to jump (with variable
 * height on release), plus a fullscreen toggle. Fixed to the camera, drawn above
 * everything. Created only on touch devices; the keyboard remains fully usable.
 */
export class TouchControls implements TouchInput {
  private leftHeld = false;
  private rightHeld = false;
  private jumpPressedFlag = false;
  private jumpReleasedFlag = false;

  constructor(scene: Phaser.Scene) {
    // Allow several simultaneous touches (run + jump at once).
    scene.input.addPointer(2);

    const cfg = GameConfig.ui.touch;
    const cam = scene.cameras.main;
    const r = cfg.radius;
    const y = cam.height - cfg.margin - r;

    // Movement buttons, bottom-left.
    const leftX = cfg.margin + r;
    const rightX = leftX + r * 2 + cfg.gap;
    this.makeButton(scene, leftX, y, '◀', {
      onDown: () => (this.leftHeld = true),
      onUp: () => (this.leftHeld = false),
    });
    this.makeButton(scene, rightX, y, '▶', {
      onDown: () => (this.rightHeld = true),
      onUp: () => (this.rightHeld = false),
    });

    // Jump button, bottom-right.
    this.makeButton(scene, cam.width - cfg.margin - r, y, '▲', {
      onDown: () => (this.jumpPressedFlag = true),
      onUp: () => (this.jumpReleasedFlag = true),
    });

    // Fullscreen toggle, top-right (needs a user gesture — a tap provides it).
    const fs = this.makeButton(scene, cam.width - cfg.margin - r, cfg.margin + r, '⛶', {
      onDown: () => {},
      onUp: () => {},
    });
    fs.arc.setScale(0.7);
    fs.arc.on('pointerup', () => scene.scale.toggleFullscreen());
  }

  get leftDown(): boolean {
    return this.leftHeld;
  }

  get rightDown(): boolean {
    return this.rightHeld;
  }

  pollJumpPressed(): boolean {
    const v = this.jumpPressedFlag;
    this.jumpPressedFlag = false;
    return v;
  }

  pollJumpReleased(): boolean {
    const v = this.jumpReleasedFlag;
    this.jumpReleasedFlag = false;
    return v;
  }

  private makeButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    handlers: { onDown: () => void; onUp: () => void },
  ): HoldButton {
    const cfg = GameConfig.ui.touch;
    const arc = scene.add
      .circle(x, y, cfg.radius, cfg.fillColor, cfg.fillAlpha)
      .setStrokeStyle(2, cfg.strokeColor, cfg.strokeAlpha)
      .setScrollFactor(0)
      .setDepth(cfg.depth)
      .setInteractive({ useHandCursor: true });

    scene.add
      .text(x, y, label, { fontFamily: 'sans-serif', fontSize: '30px', color: cfg.labelColor })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(cfg.depth + 1);

    // pointerout / pointerupoutside cover a finger sliding off before lifting.
    arc.on('pointerdown', handlers.onDown);
    arc.on('pointerup', handlers.onUp);
    arc.on('pointerout', handlers.onUp);
    arc.on('pointerupoutside', handlers.onUp);

    return { arc };
  }
}
