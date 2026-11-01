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
      { id: 'core-loop', title: 'Oxygen drains, asteroids drift, a star rides a rock', seconds: 15 },
      { id: 'float-away', title: 'Miss a jump and float away (game over, restart)', seconds: 20 },
      { id: 'page-scripts', title: "Which scripts the page loads: the game's own vs added by the host", seconds: 10 },
    ],
    isReady: () => game.ready,
    async start(id, options, t) {
      if (id === 'page-scripts') return pageScripts(t);
      t.scene('Playing');
      if (id === 'float-away') return floatAway(game, t);
      if (id === 'core-loop') return coreLoop(game, t);
      const t0 = performance.now();
      let seen = 0;
      while (performance.now() - t0 < 50_000 && !game.over && game.score < 3) {
        if (game.flying) { await wait(40); continue; }
        const key = pickHop(game);
        if (key) { await press(key, 60); t.add('hops'); }
        await wait(key ? 450 : 80);
        if (game.score > seen) { seen = game.score; t.event('scored', seen); }
        t.metric('score', game.score); t.metric('oxygen', Math.round(game.oxygen));
        t.progress(Math.min(1, game.score / 3));
      }
      t.metric('score', game.score);
      if (game.score > seen) t.event('scored', game.score);
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
  // the results must stay up: a stray key right away must not skip them
  await press(' ', 60); await wait(300);
  const kept = game.over && /Final score/.test(game.message);
  t.metric('resultsShown', kept ? 1 : 0);
  if (!kept) t.problem('bug', 'game over results vanished right after the game ended');
  await wait(1200);
  await press(' ', 60); await wait(500);
  t.metric('restarted', game.over ? 0 : 1);
  t.metric('starOnRock', game.star && game.star.a ? 1 : 0);
  t.finish(!game.over && kept ? 'done' : 'stuck');
}

// The game only loads scripts from its own folder (index.html loads ./src/main.js; the build uses base './').
// Anything else, like Studio's preview host adding /dev/__studio/report.js, is the host's, not the game's: this
// scenario lists each script with who loads it (and its HTTP status where the browser reports one), so a failed
// host script isn't filed as a game bug. It fails only if one of the game's own scripts fails to load.
async function pageScripts(t) {
  t.scene('Page');
  const gameDir = new URL('./', location.href).href;
  const isGame = (url) => url.startsWith(gameDir) && !url.includes('/__studio/');
  const status = new Map();
  for (const r of performance.getEntriesByType('resource')) {
    if (r.initiatorType === 'script' || /\.m?js(\?|$)/.test(r.name)) status.set(r.name, r.responseStatus ?? 0);
  }
  for (const s of document.querySelectorAll('script[src]')) if (!status.has(s.src)) status.set(s.src, 0);
  let own = 0, host = 0, ownFailed = 0;
  for (const [url, code] of status) {
    const mine = isGame(url);
    if (mine) own++; else host++;
    if (mine && code >= 400) ownFailed++;
    t.event(mine ? 'game-script' : 'host-script', `${new URL(url).pathname}${code ? ` (HTTP ${code})` : ''}`);
    if (mine && code >= 400) t.problem('bug', `the game's own script failed to load: ${url} (HTTP ${code})`);
    if (!mine && code >= 400) t.note(`host-added script ${new URL(url).pathname} answered HTTP ${code}: not requested by the game (fix it in the host)`);
  }
  t.metric('gameScripts', own); t.metric('hostScripts', host);
  if (!own) t.problem('bug', 'no script from the game folder found');
  t.finish(own && !ownFailed ? 'done' : 'error');
}

// Stand still for 3 s and check the core loop is there: the oxygen meter drains, the asteroids drift, a star is out.
async function coreLoop(game, t) {
  const o0 = game.oxygen, x0 = game.asteroids.map((a) => a.x);
  await wait(3000);
  const drained = o0 - game.oxygen;
  const drifted = game.asteroids.filter((a, i) => Math.abs(a.x - x0[i]) > 5).length;
  t.metric('asteroids', game.asteroids.length); t.metric('drifting', drifted);
  t.metric('oxygenDrained', Math.round(drained)); t.metric('star', game.star ? 1 : 0);
  t.event('core-loop', `oxygen -${Math.round(drained)} in 3 s, ${drifted}/${game.asteroids.length} asteroids drifted`);
  const ok = drained > 5 && drifted === game.asteroids.length && game.star && !game.over;
  if (!ok) t.problem('bug', 'core loop missing: oxygen must drain, every asteroid must drift and a star must be out');
  t.finish(ok ? 'done' : 'stuck');
}
