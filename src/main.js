// Star Skipper: hop between drifting asteroids, grab stars to refill your oxygen, don't miss a jump.
// Shapes and colours stand in for art. ART / SOUND / MUSIC markers show where Hawkes Gen assets will go later.
import Phaser from 'phaser';
import { setupPlaytest } from './playtest.js';

const W = 960, H = 540;
const TUNING = {
  rows: [90, 210, 330, 450],   // y of each asteroid lane
  perRow: 4, spacing: 240, radius: 44, landSlack: 16,
  hopX: 240, hopY: 120, hopMs: 380,
  oxygenSeconds: 18, starOxygen: 35,
  baseSpeed: 45, speedPerStar: 5, maxSpeed: 150,
};
const KEYS = { 37: 'left', 65: 'left', 39: 'right', 68: 'right', 38: 'up', 87: 'up', 40: 'down', 83: 'down' };
const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

// Shared with the playtest bot (src/playtest.js): plain data about the world, read only by the bot.
const game = { ready: false, score: 0, oxygen: 100, over: false, flying: false, speed: TUNING.baseSpeed, player: null, asteroids: [], star: null, scene: null, overAt: 0, message: '', tuning: TUNING };

const wrapX = (x) => ((x + 80) % (W + 160) + (W + 160)) % (W + 160) - 80;
// Camera: the player is always drawn at screen centre; the wrapping world scrolls around them.
const viewX = (x, camX) => wrapX(x - camX + W / 2);

class Play extends Phaser.Scene {
  create() {
    game.scene = this;
    Object.assign(game, { score: 0, oxygen: 100, over: false, overAt: 0, message: '', flying: false, speed: TUNING.baseSpeed });
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0f14);
    // ART: starfield background (Hawkes Gen skybox / texture)
    for (let i = 0; i < 70; i++) this.add.circle(Math.random() * W, Math.random() * H, Math.random() < 0.2 ? 2 : 1, 0x6a7a99, 0.6);

    // Asteroids drift sideways, lanes alternate direction.
    this.asteroids = [];
    TUNING.rows.forEach((y, r) => {
      for (let i = 0; i < TUNING.perRow; i++) {
        const x = i * TUNING.spacing + (r % 2) * 70 + 40;
        // ART: asteroid sprite
        const gfx = this.add.circle(x, y, TUNING.radius, 0x5b6678).setStrokeStyle(3, 0x8693a8);
        const a = { x, y, row: r, dir: r % 2 ? -1 : 1, mult: 0.8 + r * 0.15, gfx, r: TUNING.radius };
        this.asteroids.push(a);
      }
    });
    game.asteroids = this.asteroids;

    // Player starts on a bottom-lane asteroid.
    this.on = this.asteroids.find((a) => a.row === TUNING.rows.length - 1);
    this.pos = { x: this.on.x, y: this.on.y - 52 };
    game.player = { x: this.pos.x, y: this.pos.y }; // set now: the bot may read it before the first update
    // ART: astronaut sprite
    this.suit = this.add.rectangle(0, 0, 22, 30, 0xf29a33).setStrokeStyle(2, 0xffe2b0).setDepth(5);
    this.star = null;
    this.spawnStar();

    // HUD
    this.add.rectangle(W - 190, 24, 304, 20, 0x1c2330).setStrokeStyle(2, 0x3a4a63).setDepth(9);
    this.bar = this.add.rectangle(W - 340, 24, 300, 14, 0x4fe0ff).setOrigin(0, 0.5).setDepth(10);
    this.add.text(W - 340, 40, 'OXYGEN', { fontSize: '12px', color: '#9fb3d1' }).setDepth(10);
    this.panel = this.add.rectangle(W / 2, H / 2, 560, 220, 0x05070c, 0.88).setStrokeStyle(3, 0x4fe0ff).setDepth(19).setVisible(false);
    this.msg = this.add.text(W / 2, H / 2, '', { fontSize: '36px', color: '#ffffff', align: 'center', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(20);
    this.input.keyboard.on('keydown', (e) => this.onKey(e.keyCode));
    this.input.on('pointerdown', () => this.retry());
    this.setScore(0);
    this.layout(); // place everything for the first frame (a fresh star would otherwise sit at its world position)
    game.ready = true;
  }

  setScore(n) { game.score = n; document.getElementById('score').textContent = `Score ${n}`; }

  spawnStar() {
    const pool = this.asteroids.filter((a) => a !== this.on && a !== (this.star && this.star.a));
    const a = pool[Math.floor(Math.random() * pool.length)];
    if (this.star) this.star.gfx.destroy();
    // ART: star pickup sprite; SOUND: star chime
    this.star = { a, gfx: this.add.star(a.x, a.y - 56, 5, 6, 13, 0xffe14f).setDepth(4) };
    game.star = this.star;
  }

  onKey(code) {
    if (game.over) { if (code === 32) this.retry(); return; }
    const dir = KEYS[code];
    if (dir && !game.flying) this.hop(dir);
  }

  // Restart only after the results have been on screen a moment, so a stray key or click can't skip them.
  retry() {
    if (game.over && performance.now() - game.overAt > 1200) this.scene.restart();
  }

  hop(dir) {
    const [dx, dy] = DIRS[dir];
    const from = { x: this.pos.x, y: this.pos.y };
    // Keeps the drift of the asteroid you leave, so same-lane hops stay on target.
    const carry = this.on.dir * this.on.mult * game.speed * TUNING.hopMs / 1000;
    const to = { x: from.x + dx * TUNING.hopX + carry, y: from.y + dy * TUNING.hopY };
    game.flying = true; this.on = null; // SOUND: hop whoosh
    this.tweens.addCounter({
      from: 0, to: 1, duration: TUNING.hopMs,
      onUpdate: (tw) => {
        const t = tw.getValue();
        this.pos.x = from.x + (to.x - from.x) * t;
        this.pos.y = from.y + (to.y - from.y) * t;
        this.suit.setScale(1 + Math.sin(t * Math.PI) * 0.35);
      },
      onComplete: () => this.land(to),
    });
  }

  land(to) {
    game.flying = false; this.suit.setScale(1);
    const hit = this.asteroids.find((a) => Math.hypot(a.x - to.x, a.y - 52 - to.y) < a.r + TUNING.landSlack);
    if (!hit) return this.end('You floated away!');
    this.on = hit;
    this.pos.x = hit.x; this.pos.y = hit.y - 52; // snap onto the rock (SOUND: soft landing thud)
    if (this.star && this.star.a === hit) {
      game.oxygen = Math.min(100, game.oxygen + TUNING.starOxygen);
      this.setScore(game.score + 1); // SOUND: star pickup
      game.speed = Math.min(TUNING.maxSpeed, TUNING.baseSpeed + game.score * TUNING.speedPerStar);
      this.spawnStar();
    }
  }

  end(text) {
    game.over = true; this.on = null; game.overAt = performance.now();
    game.message = `${text}\nFinal score ${game.score}\nSpace to try again`;
    this.panel.setVisible(true);
    this.msg.setText(game.message); // MUSIC: game-over sting
  }

  update(_t, delta) {
    if (game.over) return;
    const dt = delta / 1000;
    for (const a of this.asteroids) {
      a.x = wrapX(a.x + a.dir * a.mult * game.speed * dt);
    }
    game.oxygen = Math.max(0, game.oxygen - (100 / TUNING.oxygenSeconds) * dt);
    this.layout(dt);
    if (game.oxygen <= 0 && !game.flying) this.end('Out of oxygen!');
  }

  // Put the player, asteroids, star and oxygen bar where they belong this frame.
  layout(dt = 0) {
    if (this.on) { this.pos.x = this.on.x; this.pos.y = this.on.y - 52; }
    const cam = this.pos.x;
    for (const a of this.asteroids) a.gfx.setPosition(viewX(a.x, cam), a.y);
    this.suit.setPosition(W / 2, this.pos.y);
    if (this.star) this.star.gfx.setPosition(viewX(this.star.a.x, cam), this.star.a.y - 56).rotation += dt;
    this.bar.width = 3 * game.oxygen;
    this.bar.fillColor = game.oxygen < 25 ? 0xff5a5a : 0x4fe0ff;
    game.player = { x: this.pos.x, y: this.pos.y };
  }
}

new Phaser.Game({
  type: Phaser.AUTO, width: W, height: H, backgroundColor: '#0d0f14',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: Play,
});
setupPlaytest(game);
