import type Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import { createDogBrain, moodInput, updateDogBrain, type DogBrain } from '../core/dogBrain';
import { Entity } from '../core/Entity';
import { dogFollowInput, type Vec2 } from '../core/leash';
import { applyHorizontal, clampFallSpeed } from '../core/movement';

/**
 * Der Hund hat einen eigenen Kopf: Er folgt dem Menschen, bleibt aber
 * zwischendurch zum Schnüffeln stehen oder trottet eigenwillig los. Weil die
 * Leine ein Feder-Constraint ist, zieht ihn das nicht nur zurück — er zieht
 * seinerseits am Menschen.
 *
 * Springen kann er nur minimal (~19 px, siehe GameConfig.dog.jumpVelocity):
 * Höhere Stufen schafft er nicht allein, dafür muss der Mensch ihn an der
 * Leine hochziehen.
 */
export class Dog extends Entity {
  readonly brain: DogBrain = createDogBrain();
  /** Sperrt kurz nach einem Hüpfer, damit er nicht dauerhüpft. */
  private hopCooldownMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'dog');
    this.body().setSize(GAME_CONFIG.dog.width, GAME_CONFIG.dog.height);
  }

  isGrounded(): boolean {
    const body = this.body();
    return body.blocked.down || body.touching.down;
  }

  /**
   * @param leashAccel Federbeschleunigung der Leine (px/s²) — zieht zusätzlich
   *   zur eigenen Lauflogik und kann den Hund auch anheben.
   * @param leashTaut Bei straffer Leine übernimmt die Feder das Kommando.
   * @param distance Aktuelle Leinendistanz (steuert die Stimmung).
   */
  update(
    dtMs: number,
    playerX: number,
    leashAccel: Vec2,
    leashTaut: boolean,
    distance: number,
  ): void {
    const cfg = GAME_CONFIG.dog;
    const body = this.body();
    const grounded = this.isGrounded();
    const dt = dtMs / 1000;
    this.hopCooldownMs = Math.max(0, this.hopCooldownMs - dtMs);

    updateDogBrain(
      this.brain,
      dtMs,
      distance,
      GAME_CONFIG.leash.length,
      cfg.brain,
      Math.random,
    );

    // Straffe Leine überstimmt jede Stimmung — dann zieht die Feder ohnehin.
    const mood = leashTaut ? null : moodInput(this.brain);
    const input =
      leashTaut ? 0 : (mood ?? dogFollowInput(this.carrier.x, playerX, cfg.followDistance));

    let vx = applyHorizontal(body.velocity.x, input, grounded, dtMs, {
      moveAccel: cfg.accel,
      airAccel: cfg.airAccel,
      groundDrag: cfg.drag,
      airDrag: cfg.airDrag,
      maxSpeed: cfg.maxSpeed,
    });

    // Leinenzug wirkt zusätzlich und darf die Höchstgeschwindigkeit übersteigen
    // (sonst hinge der Hund an einer Kante fest, statt hochgezogen zu werden).
    vx += leashAccel.x * dt;
    body.setVelocityX(vx);
    body.setVelocityY(clampFallSpeed(body.velocity.y + leashAccel.y * dt, GAME_CONFIG.maxFallSpeed));

    // Kleiner Hüpfer, wenn die Leine ihn nach oben zerrt und er am Boden klebt.
    // Reicht allein nicht für eine Stufe — der Zug muss den Rest erledigen.
    if (grounded && this.hopCooldownMs === 0 && leashAccel.y < -GAME_CONFIG.gravityY * 0.5) {
      body.setVelocityY(cfg.jumpVelocity);
      this.hopCooldownMs = 260;
    }

    if (Math.abs(body.velocity.x) > 8) this.display.setFlipX(body.velocity.x < 0);
  }
}
