// Procedural city generator and spatial query helpers for Cielo Bay.
import { CONFIG } from './config.js';
import { makeRng } from './random.js';

export function buildCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const palms = [];
  const lamps = [];

  const { WORLD_W, WORLD_H, BLOCK, ROAD_W, BEACH_X } = CONFIG;

  const cols = Math.floor(WORLD_W / BLOCK);
  const rows = Math.floor(WORLD_H / BLOCK);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const blockX = c * BLOCK;
      const blockY = r * BLOCK;
      const roadHalf = ROAD_W / 2;
      const innerX = blockX + roadHalf + 10;
      const innerY = blockY + roadHalf + 10;
      const innerW = BLOCK - ROAD_W - 20;
      const innerH = BLOCK - ROAD_W - 20;

      if (innerX + innerW > BEACH_X) continue;

      const numBldgs = rng.int(1, 4);
      if (numBldgs === 1) {
        const w = innerW - rng.range(0, 20);
        const h = innerH - rng.range(0, 20);
        const x = innerX + (innerW - w) / 2;
        const y = innerY + (innerH - h) / 2;
        const roof = rng.pick(CONFIG.ROOFS || ['#b45339', '#4d7c90', '#7c6f5d', '#8c525c', '#3d6b52', '#8c7842']);
        const wall = rng.pick(['#d2c2b0', '#c4b59f', '#a89882', '#d8cebe']);
        buildings.push({ x, y, w, h, roof, wall });
      } else if (numBldgs === 2) {
        const splitH = rng.chance(0.5);
        if (splitH) {
          const h1 = innerH / 2 - 8;
          const w1 = innerW - rng.range(0, 16);
          const x1 = innerX + (innerW - w1) / 2;
          const y1 = innerY + 4;
          const x2 = x1, y2 = innerY + innerH / 2 + 4, w2 = w1, h2 = h1;
          buildings.push({ x: x1, y: y1, w: w1, h: h1, roof: rng.pick(['#b45339','#4d7c90']), wall: '#d2c2b0' });
          buildings.push({ x: x2, y: y2, w: w2, h: h2, roof: rng.pick(['#7c6f5d','#3d6b52']), wall: '#c4b59f' });
        } else {
          const w1 = innerW / 2 - 8;
          const h1 = innerH - rng.range(0, 16);
          const x1 = innerX + 4;
          const y1 = innerY + (innerH - h1) / 2;
          const x2 = innerX + innerW / 2 + 4, y2 = y1, w2 = w1, h2 = h1;
          buildings.push({ x: x1, y: y1, w: w1, h: h1, roof: rng.pick(['#8c525c','#8c7842']), wall: '#d2c2b0' });
          buildings.push({ x: x2, y: y2, w: w2, h: h2, roof: rng.pick(['#b45339','#4d7c90']), wall: '#a89882' });
        }
      } else {
        const w = innerW / 2 - 6;
        const h = innerH / 2 - 6;
        const coords = [
          [innerX + 4, innerY + 4],
          [innerX + innerW / 2 + 2, innerY + 4],
          [innerX + 4, innerY + innerH / 2 + 2],
          [innerX + innerW / 2 + 2, innerY + innerH / 2 + 2]
        ];
        for (let i = 0; i < Math.min(numBldgs, coords.length); i++) {
          const [bx, by] = coords[i];
          buildings.push({
            x: bx, y: by, w: w - rng.range(0, 8), h: h - rng.range(0, 8),
            roof: rng.pick(['#b45339', '#4d7c90', '#7c6f5d', '#8c525c', '#3d6b52', '#8c7842']),
            wall: rng.pick(['#d2c2b0', '#c4b59f', '#a89882'])
          });
        }
      }
    }
  }

  for (let y = ROAD_W / 2; y < WORLD_H; y += BLOCK) {
    for (let x = ROAD_W / 2; x < BEACH_X - 40; x += BLOCK * 2) {
      if (rng.chance(0.6)) {
        lamps.push({ x: x + ROAD_W / 2 + 4, y: y - ROAD_W / 2 - 8 });
      }
    }
  }

  for (let y = 60; y < WORLD_H - 60; y += 120) {
    palms.push({ x: BEACH_X + 25 + rng.range(-15, 15), y: y + rng.range(-20, 20) });
    if (rng.chance(0.7)) {
      palms.push({ x: BEACH_X - 18, y: y + rng.range(-30, 30) });
    }
  }

  const docks = { x: BEACH_X, y: 1800, w: WORLD_W - BEACH_X, h: 600 };
  for (let dx = docks.x + 40; dx < WORLD_W - 40; dx += 120) {
    for (let dy = docks.y + 60; dy < WORLD_H - 100; dy += 140) {
      if (rng.chance(0.3)) {
        palms.push({ x: dx + rng.range(-20, 20), y: dy + rng.range(-20, 20) });
      }
    }
  }

  const spawn = { x: BLOCK + ROAD_W + 30, y: BLOCK + ROAD_W + 30 };
  const garage = { x: BLOCK * 2 + ROAD_W + 20, y: BLOCK * 3 + ROAD_W + 20 };

  return { buildings, palms, lamps, docks, spawn, garage };
}

export function isRoad(x, y) {
  const { WORLD_W, WORLD_H, BLOCK, ROAD_W, BEACH_X } = CONFIG;
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return false;
  if (x >= BEACH_X) return false;

  const rx = x % BLOCK;
  const ry = y % BLOCK;
  const roadHalf = ROAD_W / 2;

  const onVert = (rx < roadHalf || rx >= BLOCK - roadHalf);
  const onHoriz = (ry < roadHalf || ry >= BLOCK - roadHalf);

  return onVert || onHoriz;
}

export function isWater(x, y) {
  const { WORLD_W, WORLD_H, BEACH_X } = CONFIG;
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return true;
  return x >= BEACH_X + 180;
}

export function isBlocked(x, y, city) {
  if (isWater(x, y)) return true;
  if (!city || !city.buildings) return false;

  for (let i = 0; i < city.buildings.length; i++) {
    const b = city.buildings[i];
    const pad = 3;
    if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) {
      return true;
    }
  }
  return false;
}

export function roadDirAt(x, y) {
  const rx = x % CONFIG.BLOCK;
  const ry = y % CONFIG.BLOCK;
  const roadHalf = CONFIG.ROAD_W / 2;
  const onVert = (rx < roadHalf || rx >= CONFIG.BLOCK - roadHalf);
  const onHoriz = (ry < roadHalf || ry >= CONFIG.BLOCK - roadHalf);
  if (onVert && onHoriz) return 'cross';
  if (onVert) return 'vert';
  if (onHoriz) return 'horiz';
  return 'none';
}
