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
    this.generateBlockTexture();
    this.generateLightTexture();
    this.generateShadowTexture();
    this.scene.start('Game');
  }

  /** Schwarze Silhouette — die Augen sind bewusst NICHT Teil der Textur,
   *  sie werden als eigenes Overlay über der Dunkelheits-Maske gerendert. */
  private generatePlayerTexture(): void {
    const w = GAME_CONFIG.playerWidth;
    const h = GAME_CONFIG.playerHeight;
    const g = this.add.graphics();
    g.fillStyle(GAME_CONFIG.playerColor, 1);
    g.fillRoundedRect(0, 0, w, h, 6);
    // hauchdünne Kante, damit die Silhouette sich im Licht vom Boden abhebt
    g.lineStyle(1, 0x2e2e2e, 0.9);
    g.strokeRoundedRect(0, 0, w, h, 6);
    g.generateTexture('player', w, h);
    g.destroy();
  }

  /** Zwei weiße Augen — immer sichtbar, auch in völliger Dunkelheit. */
  private generateEyesTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 5, 7, 2);
    g.fillRoundedRect(11, 0, 5, 7, 2);
    g.generateTexture('eyes', 16, 8);
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
