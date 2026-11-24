# Vice Bay — an original open-world drive

[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/Wolfkid200444/make-gta-6/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/Wolfkid200444/make-gta-6/reward.svg)](https://make.fun/bounty/gta6-01)

Vice Bay is an original low-poly open-world driving game, built for the
[Make GTA 6](https://make.fun/bounty/gta6-01) bounty on make.fun. Everything
here is original: the city, its streets, the car, the story-free sun-soaked
coast — nothing from Rockstar Games or any other commercial game.

## The game

Drive a coral coupe around Vice Bay, a seeded coastal city of avenues, palms,
hotels and beachfront. The city is the same on every load, so every player
drives the same streets.

- **City + driving (chunk 1):** a 7×7 grid of avenues and streets, buildings,
  parks, street lamps, billboards, a beach and the ocean at the south edge.
- **Chase camera** that follows the car and opens up with speed.
- **Start screen** and a **HUD** with your street, speed and compass.
- **Procedural engine hum** that follows the throttle.

On foot, traffic, pedestrians, car stealing, the wanted level and police,
missions and combat come in later chunks.

## Controls

| Key | Action |
| --- | --- |
| W / ↑ | Accelerate |
| S / ↓ | Brake / reverse |
| A D / ← → | Steer |
| Space | Handbrake |
| P / Esc | Pause |

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network: every file the
game loads sits under `game/`, with Three.js r160 vendored as
`game/vendor/three.module.min.js`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` checks the entry against the scorer's caps, copies `game/` and
`screenshots/` to `/output`, and writes `/output/dossier.json`.
