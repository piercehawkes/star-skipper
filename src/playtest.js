// Hawkes Studio's playtest contract for this game (docs: hawkesstudio docs/playtest.md). The bot plays through real
// input: it presses keys like a player. Add a scenario for each new thing worth checking.
import { installPlaytest } from './playtest/hawkes-playtest.js';

// Phaser looks keys up by event.keyCode, so the events must carry keyCode and which.
const KEYCODES = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, ' ': 32 };
const press = (key, ms) => new Promise((done) => {
  const code = key === ' ' ? 'Space' : key.length === 1 ? `Key${key.toUpperCase()}` : key;
  const keyCode = KEYCODES[key] ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);
  const init = { key, code, keyCode, which: keyCode, bubbles: true };
  window.dispatchEvent(new KeyboardEvent('keydown', init));
  setTimeout(() => { window.dispatchEvent(new KeyboardEvent('keyup', init)); done(); }, ms);
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const HOPS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

// Where would a hop in this direction land, and on which asteroid? (reads the world, presses real keys)
function evaluate(game, key) {
  const T = game.tuning, [dx, dy] = HOPS[key];
  const from = game.player;
  const here = game.asteroids.reduce((b, a) => Math.hypot(a.x - from.x, a.y - 52 - from.y) < Math.hypot(b.x - from.x, b.y - 52 - from.y) ? a : b);
  const sec = T.hopMs / 1000;
  const to = { x: from.x + dx * T.hopX + here.dir * here.mult * game.speed * sec, y: from.y + dy * T.hopY };
  for (const a of game.asteroids) {
    // where the asteroid will be when we arrive (ignoring wrap)
    const ax = a.x + a.dir * a.mult * game.speed * sec;
    const d = Math.hypot(ax - to.x, a.y - 52 - to.y);
    if (d < a.r - 4) return { a, key, d };
  }
  return null;
}

// Choose a safe hop, preferring the star's asteroid, else the one nearest to it.
function pickHop(game) {
  const options = Object.keys(HOPS).map((k) => evaluate(game, k)).filter(Boolean);
  if (!options.length) return null;
  const star = game.star && game.star.a;
  const dist = (o) => Math.hypot(o.a.x - star.x, o.a.y - star.y);
  return options.reduce((b, o) => (star && dist(o) < dist(b) ? o : b)).key;
}

export function setupPlaytest(game) {
  installPlaytest({
    product: 'star-skipper',
    scenarios: [
      { id: 'smoke', title: 'Hop between asteroids and collect 3 stars', seconds: 60, tags: ['smoke'] },
      { id: 'float-away', title: 'Miss a jump and float away (game over, restart)', seconds: 20 },
    ],
    isReady: () => game.ready,
    async start(id, options, t) {
      t.scene('Playing');
      if (id === 'float-away') return floatAway(game, t);
      const t0 = performance.now();
      while (performance.now() - t0 < 50_000 && !game.over && game.score < 3) {
        if (game.flying) { await wait(40); continue; }
        const key = pickHop(game);
        if (key) { await press(key, 60); t.add('hops'); }
        await wait(key ? 450 : 80);
        t.metric('score', game.score); t.metric('oxygen', Math.round(game.oxygen));
        t.progress(Math.min(1, game.score / 3));
      }
      t.metric('score', game.score);
      if (game.score > 0) t.event('scored', game.score);
      t.finish(game.score >= 3 ? 'done' : game.over ? 'lost' : 'stuck');
    },
    stop() {},
  });
}

async function floatAway(game, t) {
  while (game.flying) await wait(40);
  // the player starts on the bottom lane: hopping down leaves the world with nothing to land on
  await press('ArrowDown', 60); t.event('hopped-into-void');
  for (let i = 0; i < 40 && !game.over; i++) await wait(100);
  t.metric('gameOver', game.over ? 1 : 0);
  if (!game.over) return t.finish('stuck');
  t.event('game-over', `score ${game.score}`);
  await press(' ', 60); await wait(500);
  t.metric('restarted', game.over ? 0 : 1);
  t.finish(game.over ? 'stuck' : 'done');
}
