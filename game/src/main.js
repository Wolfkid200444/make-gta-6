// Vice Bay: boot and the one loop. The world advances in fixed 1/60 s steps and
// the renderer paints what is there. The game moves between three screens:
// title, play and paused. A start click (or Enter) begins the drive.
//
// ?seed=N fixes the city layout. ?shot=start|drive|aerial (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BOUNDS, createCity } from './city.js';
import { createCar } from './car.js';
import { createRenderer } from './render.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createEngineHum } from './audio.js';
import { STEP, stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
const DEFAULT_SEED = 1337;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : DEFAULT_SEED;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const titleEl = document.getElementById('title');
const hudEl = document.getElementById('hud');
const pauseEl = document.getElementById('pause');

const renderer = createRenderer(canvas);
const city = createCity(renderer.scene, seed);
const car = createCar(renderer.scene);
const input = createInput(window);
const hum = createEngineHum();

let screen = 'title';

function setScreen(next) {
  screen = next;
  titleEl.classList.toggle('hidden', next !== 'title');
  hudEl.classList.toggle('hidden', next === 'title');
  pauseEl.classList.toggle('hidden', next !== 'paused');
}

function announce(message) {
  status.textContent = message;
}

function startGame() {
  car.reset(city.startPose);
  setScreen('play');
  hum.start();
  announce('Driving in Vice Bay. WASD or arrows to drive, Space to brake, P to pause.');
}

const game = {
  carState() {
    return car.state;
  },
  reset() {
    car.reset(city.startPose);
  },
  stepDrive(dt, fakeInput) {
    car.update(dt, fakeInput, city.colliders, BOUNDS);
    renderer.chase(car.state, dt);
    renderer.updateHud(car.state, city.streetName);
  },
  cameraShot(name) {
    if (name === 'aerial') {
      renderer.setView([70, 235, 265], [0, 0, 10], 50);
    } else if (name === 'start') {
      renderer.setView([9, 3.6, 150], [0, 2.5, 100], 55);
    } else {
      renderer.chase(car.state, 1);
    }
  },
  setScreen,
};

function runShot(name) {
  stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  car.reset(city.startPose);
  renderer.setView([9, 3.6, 150], [0, 2.5, 100], 55);
  setScreen('title');
  // A handle for play-testing: the live car state and city, nothing else.
  window.__viceBay = { car: car.state, city };
  announce('Vice Bay. Click or press Enter to drive.');
  let accumulator = 0;
  let last = performance.now();

  titleEl.addEventListener('click', () => {
    if (screen === 'title') startGame();
  });

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && screen === 'title') startGame();
    else if (actions & ACTION_PAUSE && screen === 'play') {
      setScreen('paused');
      hum.stop();
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === 'paused') {
      setScreen('play');
      hum.start();
      announce('Driving.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === 'play') {
      while (accumulator >= STEP) {
        car.update(STEP, input, city.colliders, BOUNDS);
        accumulator -= STEP;
      }
      renderer.chase(car.state, Math.min(accumulator + STEP, MAX_FRAME));
      renderer.updateHud(car.state, city.streetName);
      hum.update(car.state.speed, true);
    } else {
      accumulator = 0;
      renderer.updateHud(car.state, city.streetName);
      hum.update(0, false);
    }
    renderer.draw();
  }

  // Leaving the tab pauses a running game rather than letting the car roll unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      setScreen('paused');
      hum.stop();
      announce('Paused.');
    }
  });

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
