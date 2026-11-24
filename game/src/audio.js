// A small procedural engine hum: two oscillators whose pitch follows the car's
// speed. It starts only after a user gesture (the start click), and anything
// it cannot do on this browser is silently skipped.
export function createEngineHum() {
  let context = null;
  let oscillator = null;
  let sub = null;
  let gain = null;
  return {
    start() {
      try {
        if (context) {
          if (context.state === 'suspended') context.resume();
          return;
        }
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        context = new AudioContext();
        oscillator = context.createOscillator();
        oscillator.type = 'sawtooth';
        sub = context.createOscillator();
        sub.type = 'square';
        gain = context.createGain();
        gain.gain.value = 0.0;
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 700;
        oscillator.connect(filter);
        sub.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        sub.start();
      } catch {
        context = null;
      }
    },
    update(speed, driving) {
      if (!context || !gain) return;
      const ratio = Math.min(1, Math.abs(speed) / 40);
      const base = 55 + ratio * 145;
      oscillator.frequency.value = base;
      sub.frequency.value = base / 2;
      gain.gain.value = driving ? 0.018 + ratio * 0.035 : 0.0;
    },
    stop() {
      if (gain) gain.gain.value = 0.0;
    },
  };
}
