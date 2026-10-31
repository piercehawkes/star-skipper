# Star Skipper

A 2D arcade game: you hop between drifting asteroids in space, collecting stars before your oxygen runs out. Each star tops up your oxygen; miss a jump and you float away. Score is stars collected; it gets faster as you go.

Made with Hawkes Studio from the 2D in the browser (Phaser) starter.

- Play: https://piercehawkes.github.io/star-skipper/
- Run it here: `npm install`, then `npm run dev`
- Lanes: work on `dev`, Studio's beta is `beta`, `main` is the live game (GitHub Pages publishes it).

## How it plays

You are an astronaut standing on a drifting asteroid. Arrow keys (or WASD) hop one step left, right, up or down onto the next asteroid. Land on the asteroid carrying the star to score and refill 35% of your oxygen. Oxygen drains in about 18 seconds; run out, or hop onto empty space, and you float away. Every star makes the asteroids drift faster. Space (or a click) restarts after game over.

Art is shapes and colours for now; `ART:`, `SOUND:` and `MUSIC:` comments in `src/main.js` mark where Hawkes Gen assets go.
