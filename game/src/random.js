// Seeded random numbers for Vice Bay: the same seed always builds the same city,
// so every player drives the same streets and every screenshot is reproducible.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] from a random function. */
export function intBetween(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** One element of `items`, picked by a random function. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
