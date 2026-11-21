import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { buildCity, isBlocked } from './city.js';
import { createPlayer, updatePlayer } from './player.js';
import { initTraffic, updateTraffic } from './traffic.js';
import { stepCarControl } from './vehicles.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { updateWanted, updatePolice, addHeat } from './police.js';
import { input } from './input.js';

export function createWorld(seed = 12345) {
  const rng = makeRng(seed);
  const city = buildCity(seed);
  const player = createPlayer(city.spawn.x, city.spawn.y);

  const world = {
    seed,
    rng,
    city,
    time: 28800, // 8:00 AM in seconds
    tod: 'day', // 'day' | 'golden' | 'night'
    state: 'playing', // 'title' | 'playing' | 'paused' | 'busted' | 'wasted'
    player,
    cars: [],
    peds: [],
    police: [],
    guards: [],
    pickups: [],
    missionState: createMissionState(),
    bullets: [],
    effects: [],
    wanted: 0,
    heat: 0,
    busted: 0,
    money: 500,
    mission: null,
    camera: { x: player.x, y: player.y },
    cameraTarget: player,
    flags: {}
  };

  initTraffic(world);
  spawnPeds(world, 40);
  return world;
}

export function stepWorld(world, dt) {
  world.time = (world.time + dt * 60) % 86400; // time speeds up
  const hour = (world.time / 3600) % 24;
  if (hour >= 6 && hour < 17) {
    world.tod = 'day';
  } else if (hour >= 17 && hour < 19) {
    world.tod = 'golden';
  } else {
    world.tod = 'night';
  }

  if (world.state === 'playing') {
    const player = world.player;

    // Handle entering/exiting cars with 'E' key
    if (input.pressed.has('KeyE')) {
      if (player.onFoot && !player.car) {
        // Find closest parked or traffic car within 55px
        let closestCar = null;
        let minDist = 55;
        for (let car of world.cars) {
          const dist = Math.hypot(car.x - player.x, car.y - player.y);
          if (dist < minDist) {
            minDist = dist;
            closestCar = car;
          }
        }
        if (closestCar) {
          player.onFoot = false;
          player.car = closestCar;
          closestCar.kind = 'player';
          world.cameraTarget = closestCar;
          if (!world.flags.carStolen) {
            world.flags.carStolen = true;
            addHeat(world, 12, player.x, player.y);
          }
        }
      } else if (!player.onFoot && player.car) {
        // Exit car
        const car = player.car;
        player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 35;
        player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 35;
        player.onFoot = true;
        car.kind = 'traffic'; // leave running/parked
        player.car = null;
        world.cameraTarget = player;
      }
    }

    if (player.onFoot) {
      updatePlayer(world, dt);
    } else if (player.car) {
      const car = player.car;
      const ctrl = {
        up: input.keys.has('KeyW') || input.keys.has('ArrowUp'),
        down: input.keys.has('KeyS') || input.keys.has('ArrowDown'),
        left: input.keys.has('KeyA') || input.keys.has('ArrowLeft'),
        right: input.keys.has('KeyD') || input.keys.has('ArrowRight'),
        hand: input.keys.has('Space')
      };

      stepCarControl(car, ctrl, dt);

      // Car collision with buildings / water
      if (isBlocked(car.x, car.y, world.city)) {
        car.speed *= -0.4; // bounce back / stall
      }

      // Sync player pos to car
      player.x = car.x;
      player.y = car.y;
    }

    // Update traffic cars, pedestrians, wanted level, and police
    updateTraffic(world, dt);
    updatePeds(world, dt);
    updateWanted(world, dt);
    updatePolice(world, dt);
    updateMissions(world, dt);
    updateCombat(world, dt);

    // Car vs Car simple push apart
    for (let i = 0; i < world.cars.length; i++) {
      for (let j = i + 1; j < world.cars.length; j++) {
        const c1 = world.cars[i];
        const c2 = world.cars[j];
        const dist = Math.hypot(c2.x - c1.x, c2.y - c1.y);
        const minDist = (c1.w + c2.w) * 0.45;
        if (dist < minDist && dist > 0) {
          const overlap = minDist - dist;
          const nx = (c2.x - c1.x) / dist;
          const ny = (c2.y - c1.y) / dist;
          c1.x -= nx * overlap * 0.5;
          c1.y -= ny * overlap * 0.5;
          c2.x += nx * overlap * 0.5;
          c2.y += ny * overlap * 0.5;
          c1.speed *= 0.8;
          c2.speed *= 0.8;

          // Collision crime / heat if hitting police car
          if (c1.kind === 'police' && c2.kind === 'player') {
            addHeat(world, 20, c2.x, c2.y);
          } else if (c2.kind === 'police' && c1.kind === 'player') {
            addHeat(world, 20, c1.x, c1.y);
          } else if (c1.kind === 'player' && c2.kind === 'traffic' && Math.abs(c1.speed) > 50) {
            addHeat(world, 4, c1.x, c1.y);
          }
        }
      }
    }
  }

  // Camera follow target lerp
  const target = world.cameraTarget || world.player;
  if (target) {
    const targetX = target.x - CONFIG.VIEW_W / 2;
    const targetY = target.y - CONFIG.VIEW_H / 2;
    world.camera.x += (targetX - world.camera.x) * Math.min(1, dt * 8);
    world.camera.y += (targetY - world.camera.y) * Math.min(1, dt * 8);
  }

  // Clamp camera to world bounds
  const maxCamX = CONFIG.WORLD_W - CONFIG.VIEW_W;
  const maxCamY = CONFIG.WORLD_H - CONFIG.VIEW_H;
  world.camera.x = Math.max(0, Math.min(maxCamX, world.camera.x));
  world.camera.y = Math.max(0, Math.min(maxCamY, world.camera.y));
}

import { createMissionState, updateMissions } from './missions.js';
import { updateCombat } from './combat.js';

// Save & Load / State management hooks
export function saveGame(world) {
  if (typeof localStorage === 'undefined') return;
  try {
    const data = {
      money: world.money,
      missionIndex: world.missionIndex || 0,
      missionsDone: world.missionsDone || 0,
      stats: world.stats || {}
    };
    localStorage.setItem('cieloheat-save-v1', JSON.stringify(data));
  } catch (e) {}
}

export function loadGame(world) {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem('cieloheat-save-v1');
    if (!raw) return false;
    const data = JSON.parse(raw);
    world.money = data.money ?? 500;
    world.missionIndex = data.missionIndex ?? 0;
    world.missionsDone = data.missionsDone ?? 0;
    if (data.stats) world.stats = data.stats;
    world.hasSave = true;
    return true;
  } catch (e) {
    return false;
  }
}

export function checkHasSave() {
  if (typeof localStorage === 'undefined') return false;
  try {
    return !!localStorage.getItem('cieloheat-save-v1');
  } catch (e) {
    return false;
  }
}
