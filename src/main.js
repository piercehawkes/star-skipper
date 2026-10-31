// Star Skipper: a 2D starter. Run and jump with the arrow keys or WASD and Space, collect the stars.
// This is the place the game grows from: replace the shapes and the level with the real thing.
import Phaser from 'phaser';
import { setupPlaytest } from './playtest.js';

const game = { ready: false, score: 0 };

class Play extends Phaser.Scene {
  create() {
    const { width, height } = this.scale;
    this.physics.world.setBounds(0, 0, width, height);
    const ground = this.add.rectangle(width / 2, height - 20, width, 40, 0x2e3a48);
    this.physics.add.existing(ground, true);
    const ledge = this.add.rectangle(width * 0.65, height - 160, 220, 20, 0x2e3a48);
    this.physics.add.existing(ledge, true);
    this.player = this.add.rectangle(120, height - 80, 28, 40, 0xf29a33);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, [ground, ledge]);
    this.stars = this.physics.add.group({ allowGravity: false });
    // The first star sits on the ground ahead of the start, so a first run right scores (the smoke playtest checks it).
    this.stars.add(this.add.circle(220, height - 60, 10, 0x4fe0ff));
    for (let i = 1; i < 6; i++) this.stars.add(this.add.circle(160 + i * 110, height - 120 - (i % 2) * 90, 10, 0x4fe0ff));
    this.physics.add.overlap(this.player, this.stars, (_p, star) => {
      star.destroy(); game.score++; document.getElementById('score').textContent = `Score ${game.score}`;
    });
    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,A,D,W,SPACE');
    game.ready = true;
  }
  update() {
    const k = this.keys;
    const body = this.player.body;
    const left = k.LEFT.isDown || k.A.isDown;
    const right = k.RIGHT.isDown || k.D.isDown;
    body.setVelocityX(left ? -220 : right ? 220 : 0);
    if ((k.SPACE.isDown || k.UP.isDown || k.W.isDown) && body.blocked.down) body.setVelocityY(-430);
  }
}

new Phaser.Game({
  type: Phaser.AUTO, width: 960, height: 540, backgroundColor: '#0d0f14',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: 900 } } },
  scene: Play,
});
setupPlaytest(game);
