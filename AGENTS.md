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
