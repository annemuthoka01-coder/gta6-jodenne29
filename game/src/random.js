// Mulberry32 seeded RNG for deterministic procedural city building and gameplay.

export function makeRng(seed) {
  let s = (seed | 0);
  return {
    next() {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) {
      return min + this.next() * (max - min);
    },
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    pick(arr) {
      if (!arr || arr.length === 0) return undefined;
      return arr[this.int(0, arr.length - 1)];
    },
    chance(p) {
      return this.next() < p;
    }
  };
}
