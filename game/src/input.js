// Keyboard input for Vice Bay: WASD and the arrow keys drive, Space is the handbrake,
// P or Escape pauses, Enter or Space confirms on the menus.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'brake',
  Enter: 'confirm',
  KeyP: 'pause', Escape: 'pause',
};

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  function onDown(event) {
    const name = KEYS[event.code];
    if (!name) return;
    event.preventDefault();
    if (name === 'confirm') actions |= ACTION_CONFIRM;
    else if (name === 'pause') actions |= ACTION_PAUSE;
    held.add(name);
  }
  function onUp(event) {
    held.delete(KEYS[event.code]);
  }
  function onBlur() {
    held.clear();
  }
  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  target.addEventListener('blur', onBlur);
  return {
    get throttle() { return held.has('up') ? 1 : 0; },
    get brake() { return held.has('down') || held.has('brake') ? 1 : 0; },
    get steer() { return (held.has('left') ? -1 : 0) + (held.has('right') ? 1 : 0); },
    get handbrake() { return held.has('brake') ? 1 : 0; },
    takeActions() {
      const value = actions;
      actions = 0;
      return value;
    },
  };
}
