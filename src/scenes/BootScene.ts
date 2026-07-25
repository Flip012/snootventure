import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * Erzeugt alle Platzhalter-Texturen zur Laufzeit — keine Asset-Downloads.
 * Drop-in-Slot für echte Grafiken (z. B. Kenney CC0): Texturen hier per
 * this.load.image(...) laden und die generate*-Aufrufe entfernen; die
 * Textur-Keys ('player', 'block', 'eyes', 'light', 'shadow') bleiben stabil.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.generatePlayerTexture();
    this.generateEyesTexture();
    this.generateDogTexture();
    this.generateDogEyesTexture();
    this.generateBlockTexture();
    this.generateGoalTexture();
    this.generateLightTexture();
    this.generateShadowTexture();
    this.scene.start('Game');
  }

  /**
   * Menschliche Silhouette: Kopf, Hals, Schultern, verjüngter Rumpf, ein
   * angedeuteter Arm und zwei Beine mit Spalt. Die Augen sind bewusst NICHT
   * Teil der Textur — sie liegen als Overlay über der Dunkelheits-Maske.
   */
  private generatePlayerTexture(): void {
    const w = GAME_CONFIG.playerWidth; // 22
    const h = GAME_CONFIG.playerHeight; // 46
    const cx = w / 2;
    const g = this.add.graphics();
    g.fillStyle(GAME_CONFIG.playerColor, 1);

    // Kopf (leicht oval) + Hals
    g.fillEllipse(cx, 8, 13, 15);
    g.fillRect(cx - 2.5, 14, 5, 4);

    // Oberkörper: breitere Schultern, zur Hüfte verjüngt
    g.fillTriangle(cx - 8, 18, cx + 8, 18, cx + 5.5, 30);
    g.fillTriangle(cx - 8, 18, cx + 5.5, 30, cx - 5.5, 30);
    g.fillRoundedRect(cx - 8, 17, 16, 6, 3); // Schulterlinie
    g.fillRect(cx - 5.5, 28, 11, 4); // Hüfte

    // Arm, der nach vorn zur Leine geht
    g.fillRoundedRect(cx + 4, 20, 4, 12, 2);

    // Beine mit Spalt
    g.fillRoundedRect(cx - 5.5, 31, 4.5, h - 32, 2);
    g.fillRoundedRect(cx + 1, 31, 4.5, h - 32, 2);
    // Füße
    g.fillRect(cx - 6.5, h - 3, 6, 3);
    g.fillRect(cx + 0.5, h - 3, 6, 3);

    g.generateTexture('player', w, h);
    g.destroy();
  }

  /** Zwei weiße Augen — immer sichtbar, auch in völliger Dunkelheit. */
  private generateEyesTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 4, 5, 1.5);
    g.fillRoundedRect(7, 0, 4, 5, 1.5);
    g.generateTexture('eyes', 11, 5);
    g.destroy();
  }

  /** Hund als schwarze Silhouette: Körper, Kopf, Beine, Rute. */
  private generateDogTexture(): void {
    const w = GAME_CONFIG.dog.width;
    const h = GAME_CONFIG.dog.height;
    const g = this.add.graphics();
    g.fillStyle(GAME_CONFIG.playerColor, 1);
    // Rumpf
    g.fillRoundedRect(2, 5, w - 10, h - 9, 4);
    // Kopf + Schnauze (nach rechts blickend)
    g.fillRoundedRect(w - 12, 1, 11, 10, 3);
    g.fillRect(w - 5, 5, 5, 5);
    // Ohr
    g.fillTriangle(w - 11, 2, w - 6, 2, w - 9, -3);
    // Beine
    g.fillRect(4, h - 5, 4, 5);
    g.fillRect(w - 14, h - 5, 4, 5);
    // Rute
    g.fillTriangle(2, 6, 2, 11, -4, 1);
    g.lineStyle(1, 0x2e2e2e, 0.9);
    g.strokeRoundedRect(2, 5, w - 10, h - 9, 4);
    g.generateTexture('dog', w, h);
    g.destroy();
  }

  /** Ein Hundeauge — im Dunkeln das einzig Sichtbare am Hund. */
  private generateDogEyesTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 4, 5, 1.5);
    g.generateTexture('dogEyes', 4, 5);
    g.destroy();
  }

  /** Ziel-Marker: heller Rahmen, damit er auch im Dunkeln auffindbar ist. */
  private generateGoalTexture(): void {
    const w = 40;
    const h = 56;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.16);
    g.fillRect(0, 0, w, h);
    g.lineStyle(2, 0xffffff, 0.85);
    g.strokeRect(1, 1, w - 2, h - 2);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(w / 2 - 3, h / 2 - 12, 6, 18);
    g.fillRect(w / 2 - 3, h / 2 + 9, 6, 6);
    g.generateTexture('goal', w, h);
    g.destroy();
  }

  private generateBlockTexture(): void {
    // Weißer 32x32-Block mit dezenter Kante; Graustufe pro Ebene via setTint.
    const s = 32;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, s, s);
    g.fillStyle(0x000000, 0.18);
    g.fillRect(0, s - 4, s, 4);
    g.fillRect(s - 2, 0, 2, s);
    g.generateTexture('block', s, s);
    g.destroy();
  }

  /** Radialer Licht-Gradient — Stanze für die Dunkelheits-Maske + Korona. */
  private generateLightTexture(): void {
    const size = 256;
    const canvas = this.textures.createCanvas('light', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.98)');
    grad.addColorStop(0.75, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  /** Weicher Schatten-Blob (schwarzer Radial-Gradient), als Ellipse skaliert. */
  private generateShadowTexture(): void {
    const size = 128;
    const canvas = this.textures.createCanvas('shadow', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.7)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }
}
