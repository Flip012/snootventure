import type Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import {
  createDogBrain,
  moodInput,
  updateDogBrain,
  type DogBrain,
  type SniffSpot,
} from '../core/dogBrain';
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
  /** Läuft für Wackel-/Sitz-Animationen mit. */
  private animPhase = 0;

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
    player: { x: number; y: number; facing: -1 | 1; idleMs: number },
    leashAccel: Vec2,
    leashTaut: boolean,
    distance: number,
    spots: readonly SniffSpot[],
  ): void {
    const cfg = GAME_CONFIG.dog;
    const body = this.body();
    const grounded = this.isGrounded();
    const dt = dtMs / 1000;
    this.hopCooldownMs = Math.max(0, this.hopCooldownMs - dtMs);

    updateDogBrain(
      this.brain,
      dtMs,
      {
        dogX: this.carrier.x,
        dogY: this.carrier.y,
        playerX: player.x,
        playerY: player.y,
        distanceToPlayer: distance,
        leashLength: GAME_CONFIG.leash.length,
        spots,
        playerIdleMs: player.idleMs,
      },
      cfg.brain,
      Math.random,
    );

    // Hunde traben an der Leine gern vorweg: Beim gehenden Menschen liegt das
    // Folgeziel ein Stück in dessen Laufrichtung.
    const targetX = player.x + (player.idleMs === 0 ? player.facing * cfg.brain.trotAhead : 0);

    // Straffe Leine überstimmt jede Eigenwilligkeit — er hört auf zu
    // schnüffeln und läuft nach. Wichtig: NICHT schlaff werden, sonst hängt
    // er am Leinenende fest und bremst den Menschen dauerhaft aus.
    const mood = leashTaut
      ? null
      : moodInput(this.brain, this.carrier.x, spots, cfg.brain.arriveDistance);
    const input = mood ?? dogFollowInput(this.carrier.x, targetX, cfg.followDistance);

    const speed =
      this.brain.mood === 'zoomies' ? cfg.maxSpeed * cfg.brain.zoomiesSpeed : cfg.maxSpeed;
    let vx = applyHorizontal(body.velocity.x, input, grounded, dtMs, {
      moveAccel: cfg.accel,
      airAccel: cfg.airAccel,
      groundDrag: cfg.drag,
      airDrag: cfg.airDrag,
      maxSpeed: speed,
    });

    // Leinenzug wirkt zusätzlich und darf die Höchstgeschwindigkeit übersteigen
    // (sonst hinge der Hund an einer Kante fest, statt hochgezogen zu werden).
    vx += leashAccel.x * dt;
    body.setVelocityX(vx);
    body.setVelocityY(clampFallSpeed(body.velocity.y + leashAccel.y * dt, GAME_CONFIG.maxFallSpeed));

    // Kleiner Hüpfer, wenn die Leine ihn nach oben zerrt und er am Boden klebt.
    // Reicht allein nicht für eine Stufe — der Zug muss den Rest erledigen.
    // Bei den Zoomies hüpft er auch aus reinem Übermut.
    const wantsHop =
      leashAccel.y < -GAME_CONFIG.gravityY * 0.5 ||
      (this.brain.mood === 'zoomies' && Math.random() < 0.05);
    if (grounded && this.hopCooldownMs === 0 && wantsHop) {
      body.setVelocityY(cfg.jumpVelocity);
      this.hopCooldownMs = 260;
    }

    if (Math.abs(body.velocity.x) > 8) this.display.setFlipX(body.velocity.x < 0);

    this.animate(dtMs);
  }

  /**
   * Körpersprache: Markieren = Bein heben (Kippen), Schütteln = schnelles
   * Wackeln, Sitzen = Hinterteil abgesenkt. Alles über Rotation/Skalierung
   * der Silhouette, ohne zusätzliche Texturen.
   */
  private animate(dtMs: number): void {
    this.animPhase += dtMs;
    const flip = this.display.flipX ? -1 : 1;

    let targetTilt = 0;
    let targetScaleY = 1;

    switch (this.brain.mood) {
      case 'shake':
        // ~9 Hz Wackeln um die Längsachse
        targetTilt = Math.sin(this.animPhase * 0.056) * 0.3;
        this.display.setRotation(targetTilt);
        this.display.setScale(1, 1);
        return;
      case 'sit':
        // Hinterteil abgesetzt: leicht gestaucht und nach hinten gekippt
        targetTilt = -0.3 * flip;
        targetScaleY = 0.86;
        break;
      case 'spot':
        if (this.brain.lingering) {
          targetTilt = this.brain.marking ? 0.24 * flip : 0.1 * flip;
        }
        break;
      default:
        break;
    }

    const ease = 0.15;
    this.display.setRotation(this.display.rotation + (targetTilt - this.display.rotation) * ease);
    this.display.setScale(
      1,
      this.display.scaleY + (targetScaleY - this.display.scaleY) * ease,
    );
  }
}
