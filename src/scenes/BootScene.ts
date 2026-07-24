import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * Erzeugt alle Platzhalter-Texturen zur Laufzeit — keine Asset-Downloads.
 * Drop-in-Slot für echte Grafiken (z. B. Kenney CC0): Texturen hier per
 * this.load.image(...) laden und die generate*-Aufrufe entfernen; die
 * Textur-Keys ('player', 'block') bleiben stabil.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.generatePlayerTexture();
    this.generateBlockTexture();
    this.scene.start('Game');
  }

  private generatePlayerTexture(): void {
    const w = GAME_CONFIG.playerWidth;
    const h = GAME_CONFIG.playerHeight;
    const g = this.add.graphics();
    g.fillStyle(GAME_CONFIG.playerColor, 1);
    g.fillRoundedRect(0, 0, w, h, 6);
    // Zwei "Augen", damit die Blickrichtung lesbar ist
    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(w - 12, 8, 4, 6);
    g.fillRect(w - 20, 8, 4, 6);
    g.generateTexture('player', w, h);
    g.destroy();
  }

  private generateBlockTexture(): void {
    // Weißer 32x32-Block mit dezenter Kante; Färbung pro Ebene via setTint.
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
}
