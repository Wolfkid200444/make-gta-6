// Vice Bay (gta6-01 entry, Node 22, standard library only): the game is this directory's
// game/ folder, plain static files a desktop browser loads offline (game/index.html and its ES
// modules, Three.js vendored under game/vendor/, no network request), and the program hands it
// in. It copies game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library.
// The game is an original low-poly open-world drive: a seeded coastal city to explore by car,
// with a start screen, a chase camera and a HUD. Before the dossier is written, the program
// checks the entry against the scorer's caps and refuses to hand in a broken one.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): refuse here, with a plain message,
// rather than handing in an entry the scorer would refuse.
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 50331648;
const SHOT_MAX_BYTES = 262144;

function fail(message: string): never {
  throw new Error(`Vice Bay entry check failed: ${message}`);
}

function walkFiles(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stats = statSync(path);
    if (stats.isDirectory()) walkFiles(path, found);
    else if (stats.isFile()) found.push(path);
  }
  return found;
}

const gameDir = join(here, 'game');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
const gameFiles = walkFiles(gameDir);
if (gameFiles.length > GAME_MAX_FILES) fail(`game/ holds ${gameFiles.length} files, over the ${GAME_MAX_FILES} cap`);
const gameBytes = gameFiles.reduce((sum, file) => sum + statSync(file).size, 0);
if (gameBytes > GAME_MAX_BYTES) fail(`game/ is ${gameBytes} bytes, over the ${GAME_MAX_BYTES} cap`);

const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith('.')).sort()
  : [];
if (shots.length < 3 || shots.length > 4) fail(`screenshots/ holds ${shots.length} images, need 3 or 4`);
for (const shot of shots) {
  const size = statSync(join(shotsDir, shot)).size;
  if (size > SHOT_MAX_BYTES) fail(`screenshots/${shot} is ${size} bytes, over the ${SHOT_MAX_BYTES} cap`);
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// Only text_max_bytes shapes the bytes; the other caps above are checked by hand first.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
