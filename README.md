[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/cervus-snoopy/velvet-fox-vault-7k2q/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/cervus-snoopy/velvet-fox-vault-7k2q/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

# SHADOW VAULT — a stealth game

A thief in the museum at night. Pocket all 3 artifacts on each floor, then
reach the green EXIT without being seen. Three floors, each harder than the
last: more guards, crossing patrols, fewer shadows to hide in.

## How to play

Serve the game (any static server works) and open `game/index.html`:

```sh
node serve.ts
# open http://localhost:8080
```

- **WASD / arrow keys** — move
- **SHIFT** — sneak: slower, quieter, harder to spot
- **P / ESC** — pause
- **M** — mute
- **R** — retry the level

## The stealth

- Guards patrol waypoints and sweep **vision cones** (±35°, ~220px). A wall
  or crate between you and a guard breaks their line of sight.
- The **SEEN meter** fills while a guard can see you — faster up close,
  slower while you sneak, **3x slower inside a shadow patch**. Step out of
  sight and it drains back down: every near-miss is a second chance.
- At full meter the **alarm** sounds and every guard chases you. If one
  touches you, you are caught.
- Crates block sight. Shadows hide you even inside a cone. Footsteps are
  synthesized in WebAudio — a guard's steps get louder as they get nearer,
  so you can hear where they are without seeing them.

## Structure

Vanilla JavaScript, no libraries, one clear job per file under `game/src/`:

| file | job |
| --- | --- |
| `config.js` | every tunable number: speeds, cone, detection rates, colors |
| `random.js` | seeded RNG (mulberry32) for deterministic dressing |
| `level.js` | the three floor maps, parsing, collision, fresh game state |
| `guards.js` | patrol AI, vision cones, line-of-sight raycasts, detection |
| `player.js` | movement, sneaking, artifact pickup |
| `audio.js` | synthesized WebAudio: footsteps, alarm, chimes, jingles |
| `render.js` | canvas drawing: floor, cones, guards, thief, HUD, screens |
| `shots.js` | the four staged screenshot scenes |
| `input.js` | keyboard + mouse |
| `main.js` | boot, fixed-timestep loop, screens, `?shot=` hook |

`main.ts` (root) hands the entry in: it copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-game.ts` library.

## Screenshots

Real renders of the game's own code, staged by `?shot=cover|patrol|alarm|win&seed=N`:

1. `1-cover.jpg` — level 2, sneaking behind a crate as a cone sweeps past
2. `2-patrol.jpg` — level 1, two guards on their beats
3. `3-alarm.jpg` — the meter full, a guard closing in
4. `4-win.jpg` — the vault emptied

## License

MIT — see [LICENSE](LICENSE).
