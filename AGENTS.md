# Star Skipper: agent guide

A 2D arcade game: you hop between drifting asteroids in space, collecting stars before your oxygen runs out. Each star tops up your oxygen; miss a jump and you float away. Score is stars collected; it gets faster as you go.

- Engine: 2D in the browser (Phaser). Vite (`npm run dev`, `npm run build` to `dist/`). Plain JavaScript modules in `src/`.
- **Lanes:** `dev` -> `beta` -> `main`. Never push `main`: going live is the owner's, through Hawkes Studio.
- **Playtests:** `src/playtest.js` implements Hawkes Studio's playtest contract (`window.hawkesPlaytest`). Its bot
  plays through real input (key events), never by moving things directly. Keep the `smoke` scenario working when you
  change the game, and add a scenario for each new thing worth checking. `src/playtest/` are Studio's copies: don't edit them.
- **Studio's hook:** `.github/workflows/hawkes-studio.yml` tells Studio about pushes to beta and main. Keep it.
- **Live:** `.github/workflows/pages.yml` builds and publishes `main` to GitHub Pages.
- Generated art, sound and music come from Hawkes Gen (hawkesgen.ai), never from keys kept in this repo.

## The game as it is

- `src/main.js`: one Phaser scene (`Play`). Asteroids in 4 lanes drift sideways (alternate directions, wrap around). A hop moves a fixed step (`TUNING.hopX`/`hopY`), keeps the drift of the rock you left, and lands on whichever asteroid is under you at the end; none means game over. One star at a time rides an asteroid. Tuning lives in `TUNING`. The shared `game` object (score, oxygen, over, flying, player, asteroids, star) is read by the playtest bot.
- Playtest scenarios (`src/playtest.js`): `smoke` (bot hops to stars through real key events, done at 3 stars), `core-loop` (stands still 3 s: oxygen drains, every asteroid drifts, a star is out), `float-away` (hop into the void, game over, Space restarts) and `page-scripts` (lists each script the page loads as the game's own or host-added, e.g. Studio's preview host adds `/dev/__studio/report.js`; fails only if a game script fails). Key events carry `keyCode`/`which` because Phaser reads those.
