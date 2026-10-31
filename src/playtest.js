// Hawkes Studio's playtest contract for this game (docs: hawkesstudio docs/playtest.md). The bot plays through real
// input: it presses keys like a player. Add a scenario for each new thing worth checking.
import { installPlaytest } from './playtest/hawkes-playtest.js';

const press = (key, ms) => new Promise((done) => {
  const code = key === ' ' ? 'Space' : key.length === 1 ? `Key${key.toUpperCase()}` : key;
  window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true }));
  setTimeout(() => { window.dispatchEvent(new KeyboardEvent('keyup', { key, code, bubbles: true })); done(); }, ms);
});

export function setupPlaytest(game) {
  installPlaytest({
    product: "star-skipper",
    scenarios: [{ id: 'smoke', title: 'Boot, move around, score a point', seconds: 45, tags: ['smoke'] }],
    isReady: () => game.ready,
    async start(id, options, t) {
      t.scene('Playing');
      const keys = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'];
      const t0 = performance.now();
      for (let i = 0; performance.now() - t0 < 30_000; i++) {
        await press(keys[i % keys.length], 700);
        if (i % 3 === 0) await press(' ', 120);
        t.metric('score', game.score);
        t.progress(Math.min(1, (performance.now() - t0) / 30_000));
        if (game.score > 0) { t.event('scored', game.score); break; }
      }
      t.finish(game.score > 0 ? 'done' : 'stuck');
    },
    stop() {},
  });
}
