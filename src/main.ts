import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: GameConfig.world.backgroundColor,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GameConfig.world.viewWidth,
    height: GameConfig.world.viewHeight,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GameConfig.player.gravityY },
      debug: false,
    },
  },
  scene: [BootScene, GameScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
