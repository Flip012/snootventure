import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import type { Player } from '../entities/Player';
import type { LampDef } from '../level/types';

/** Runtime lamp: its definition plus the current (possibly swinging) bulb pos. */
interface Lamp {
  def: LampDef;
  radius: number;
  bulbX: number;
  bulbY: number;
  glow: Phaser.GameObjects.Image;
}

const DEG2RAD = Math.PI / 180;

// Depths: fixtures + glow sit above the darkness overlay so lamps read even in
// pitch black; the overlay itself sits below the always-visible eyes (600).
const OVERLAY_DEPTH = 500;
const FIXTURE_DEPTH = 555;
const GLOW_DEPTH = 550;

/**
 * Turns the scene dark and lights it only around lamps. Each frame it:
 *  1. advances swinging lamps (pendulum on a cord),
 *  2. rebuilds a screen-space darkness RenderTexture, erasing a soft circle at
 *     each lamp so the scene shows through only there,
 *  3. draws additive bulb glow + the lamp fixtures (cord + bulb),
 *  4. projects the player's shadow away from every nearby lamp (so swinging
 *     lamps make the shadows sway).
 *
 * Lamps are expressed in canonical world coordinates (the active layer), which
 * is also where the player's body and shadow live — so shadow maths is direct.
 */
export class LightingSystem {
  private readonly player: Player;
  private readonly lamps: Lamp[] = [];

  private readonly darkRT: Phaser.GameObjects.RenderTexture;
  private readonly eraseBrush: Phaser.GameObjects.Image;
  private readonly fixtureGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, lampDefs: LampDef[], player: Player) {
    this.player = player;

    const cam = scene.cameras.main;
    this.darkRT = scene.add
      .renderTexture(0, 0, cam.width, cam.height)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(OVERLAY_DEPTH);

    // Reusable brush used to erase soft holes into the darkness. Constructed
    // directly so it is NOT on the display list — it only stamps into the RT.
    this.eraseBrush = new Phaser.GameObjects.Image(scene, 0, 0, 'radial');
    this.eraseBrush.setBlendMode(Phaser.BlendModes.ERASE);

    this.fixtureGfx = scene.add.graphics().setDepth(FIXTURE_DEPTH);

    const glowCfg = GameConfig.lighting;
    for (const def of lampDefs) {
      const radius = def.radius ?? glowCfg.lightRadiusDefault;
      const glow = scene.add
        .image(def.x, def.y, 'radial')
        .setTint(glowCfg.lamp.bulbColor)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(glowCfg.glowAlpha)
        .setDepth(GLOW_DEPTH)
        .setDisplaySize(radius * 2 * glowCfg.glowScale, radius * 2 * glowCfg.glowScale);
      this.lamps.push({ def, radius, bulbX: def.x, bulbY: def.y, glow });
    }
  }

  /** Advance and render the lighting for this frame. */
  update(time: number, camera: Phaser.Cameras.Scene2D.Camera): void {
    this.advanceLamps(time);
    this.drawFixtures();
    this.rebuildDarkness(camera);
    this.drawShadows();
  }

  /** Compute each lamp's current bulb position (swing) and move its glow. */
  private advanceLamps(time: number): void {
    for (const lamp of this.lamps) {
      const swing = lamp.def.swing;
      if (swing) {
        const phase = (swing.phaseDeg ?? 0) * DEG2RAD;
        const angle =
          swing.amplitudeDeg * DEG2RAD * Math.sin((time / swing.periodMs) * Math.PI * 2 + phase);
        lamp.bulbX = lamp.def.x + Math.sin(angle) * swing.length;
        lamp.bulbY = lamp.def.y + Math.cos(angle) * swing.length;
      } else {
        lamp.bulbX = lamp.def.x;
        lamp.bulbY = lamp.def.y;
      }
      lamp.glow.setPosition(lamp.bulbX, lamp.bulbY);
    }
  }

  /** Draw cords (for swinging lamps) and bulbs. */
  private drawFixtures(): void {
    const cfg = GameConfig.lighting.lamp;
    const g = this.fixtureGfx;
    g.clear();
    for (const lamp of this.lamps) {
      if (lamp.def.swing) {
        g.lineStyle(2, cfg.cordColor, 1);
        g.lineBetween(lamp.def.x, lamp.def.y, lamp.bulbX, lamp.bulbY);
      }
      g.fillStyle(cfg.bulbColor, 1);
      g.fillCircle(lamp.bulbX, lamp.bulbY, cfg.bulbRadius);
    }
  }

  /** Rebuild the darkness overlay, erasing a soft circle at each lamp. */
  private rebuildDarkness(camera: Phaser.Cameras.Scene2D.Camera): void {
    const cfg = GameConfig.lighting;
    const zoom = camera.zoom;
    const view = camera.worldView;

    this.darkRT.clear();
    this.darkRT.fill(cfg.overlayColor, cfg.ambientDarkness);

    for (const lamp of this.lamps) {
      const sx = (lamp.bulbX - view.x) * zoom;
      const sy = (lamp.bulbY - view.y) * zoom;
      const diameter = lamp.radius * 2 * zoom;
      this.eraseBrush.setDisplaySize(diameter, diameter).setPosition(sx, sy);
      this.darkRT.draw(this.eraseBrush);
    }
  }

  /** Project the player's shadow away from every nearby lamp. */
  private drawShadows(): void {
    const cfg = GameConfig.lighting.shadow;
    const g = this.player.shadowGfx;
    g.clear();

    const feetX = this.player.physics.x;
    const feetY = this.player.physics.y + this.player.halfHeight;
    const halfNear = (this.player.bodyWidth * cfg.widthNear) / 2;
    const halfFar = (this.player.bodyWidth * cfg.widthFar) / 2;

    for (const lamp of this.lamps) {
      const dx = feetX - lamp.bulbX;
      // Flatten the vertical component so the shadow lies along the ground while
      // still angling — and sweeping — as the lamp swings overhead.
      const dy = (feetY - lamp.bulbY) * 0.18;
      const dist = Math.hypot(feetX - lamp.bulbX, feetY - lamp.bulbY);
      if (dist < 1 || dist > cfg.maxDist) continue;

      const len = Phaser.Math.Linear(cfg.minLen, cfg.maxLen, Math.min(dist / cfg.maxDist, 1));
      const alpha = cfg.opacity * (1 - dist / cfg.maxDist);
      const mag = Math.hypot(dx, dy) || 1;
      const nx = dx / mag;
      const ny = dy / mag;
      const px = -ny; // perpendicular
      const py = nx;

      const farX = feetX + nx * len;
      const farY = feetY + ny * len;

      g.fillStyle(cfg.color, alpha);
      g.beginPath();
      g.moveTo(feetX + px * halfNear, feetY + py * halfNear);
      g.lineTo(feetX - px * halfNear, feetY - py * halfNear);
      g.lineTo(farX - px * halfFar, farY - py * halfFar);
      g.lineTo(farX + px * halfFar, farY + py * halfFar);
      g.closePath();
      g.fillPath();
    }
  }
}
