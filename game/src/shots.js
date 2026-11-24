// The screenshot scenes behind ?shot=start|drive|aerial. Each one plays the real
// game forward from a fresh world for a fixed number of steps, so the frame is
// what driving really looks like and the same seed always gives the same frame.
export const STEP = 1 / 60;

function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/**
 * Set the game to the named scene (start, drive or aerial; any other name is
 * start) and leave it frozen on the frame the screenshot takes.
 * `game` is the live game: reset(), stepDrive(dt, input), cameraShot(name),
 * setScreen(name).
 */
export function stageShot(name, game) {
  if (name === 'drive') {
    game.reset();
    for (let step = 0; step < 6 / STEP; step += 1) {
      const car = game.carState();
      // North is heading PI: a heading above PI has drifted west, below it east.
      // Positive steer turns the car right (clockwise from above), so the
      // correction is the negative of the heading error, plus a pull back to
      // the centre line of Marina Blvd (x = 0).
      const headingError = wrapAngle(Math.PI - car.heading);
      const steer = Math.max(-1, Math.min(1, -headingError * 1.5 - car.x * 0.02));
      game.stepDrive(STEP, { throttle: 1, brake: 0, steer, handbrake: 0 });
    }
    game.cameraShot('chase');
    game.setScreen('play');
    return;
  }
  if (name === 'aerial') {
    game.reset();
    game.cameraShot('aerial');
    game.setScreen('play');
    return;
  }
  game.reset();
  game.cameraShot('start');
  game.setScreen('title');
}
