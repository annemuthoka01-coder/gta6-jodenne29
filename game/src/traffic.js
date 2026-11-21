import { CONFIG } from './config.js';
import { makeCar, CAR_MODELS } from './vehicles.js';
import { isBlocked, roadDirAt } from './city.js';

export function initTraffic(world) {
  const { city, rng } = world;
  const models = Object.keys(CAR_MODELS);

  // 1. Spawn parked cars around buildings and streets
  for (let b of city.buildings) {
    if (rng.chance(0.6)) {
      // Parked alongside the building
      const side = rng.int(0, 3);
      let px = b.x, py = b.y, pAngle = 0;
      if (side === 0) { px = b.x + b.w / 2; py = b.y - 20; pAngle = 0; }
      else if (side === 1) { px = b.x + b.w + 20; py = b.y + b.h / 2; pAngle = Math.PI / 2; }
      else if (side === 2) { px = b.x + b.w / 2; py = b.y + b.h + 20; pAngle = Math.PI; }
      else { px = b.x - 20; py = b.y + b.h / 2; pAngle = -Math.PI / 2; }

      if (!isBlocked(px, py, city)) {
        const modelName = rng.pick(models);
        const car = makeCar(px, py, pAngle, modelName, 'parked', rng.int(0, 4));
        world.cars.push(car);
      }
    }
  }

  // 2. Spawn traffic cars on roads
  const trafficCount = 28;
  for (let i = 0; i < trafficCount; i++) {
    const rx = rng.range(CONFIG.ROAD_W, CONFIG.BEACH_X - CONFIG.ROAD_W);
    const ry = rng.range(CONFIG.ROAD_W, CONFIG.WORLD_H - CONFIG.ROAD_W);
    const dir = roadDirAt(rx, ry);

    if (dir !== 'none' && !isBlocked(rx, ry, city)) {
      let angle = 0;
      let targetDir = 'vert';
      if (dir === 'vert' || (dir === 'cross' && rng.chance(0.5))) {
        angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
        targetDir = 'vert';
      } else {
        angle = rng.chance(0.5) ? 0 : Math.PI;
        targetDir = 'horiz';
      }

      const modelName = rng.pick(models);
      const car = makeCar(rx, ry, angle, modelName, 'traffic', rng.int(0, 4));
      car.speed = rng.range(80, 140);
      car.targetDir = targetDir;
      world.cars.push(car);
    }
  }
}

export function updateTraffic(world, dt) {
  const { city, rng, player, camera } = world;

  for (let car of world.cars) {
    if (car.kind === 'parked') continue;

    if (car.kind === 'traffic') {
      // Simple traffic AI: move forward along road grid, slow for obstacles ahead
      const model = CAR_MODELS[car.model] || CAR_MODELS.Solano;
      const targetSpeed = 110;

      // Check ahead for player or other cars
      let blockedAhead = false;
      const fwdX = car.x + Math.cos(car.angle) * 45;
      const fwdY = car.y + Math.sin(car.angle) * 45;

      if (Math.hypot(player.x - fwdX, player.y - fwdY) < 40) {
        blockedAhead = true;
      }

      for (let other of world.cars) {
        if (other === car) continue;
        if (Math.hypot(other.x - fwdX, other.y - fwdY) < 35) {
          blockedAhead = true;
          break;
        }
      }

      if (isBlocked(fwdX, fwdY, city)) {
        blockedAhead = true;
        car.angle += Math.PI / 2; // turn away from wall
      }

      if (blockedAhead) {
        car.speed = Math.max(0, car.speed - model.accel * 2 * dt);
      } else {
        if (car.speed < targetSpeed) {
          car.speed += model.accel * dt;
        } else {
          car.speed = Math.max(targetSpeed, car.speed - model.accel * dt);
        }
      }

      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;

      // Wrap or respawn if too far from camera
      if (Math.abs(car.x - (camera.x + CONFIG.VIEW_W / 2)) > CONFIG.VIEW_W * 1.5 ||
          Math.abs(car.y - (camera.y + CONFIG.VIEW_H / 2)) > CONFIG.VIEW_H * 1.5) {
        // Respawn near camera edge
        const side = rng.int(0, 3);
        if (side === 0) {
          car.x = camera.x + rng.range(0, CONFIG.VIEW_W);
          car.y = camera.y - 100;
          car.angle = Math.PI / 2;
        } else if (side === 1) {
          car.x = camera.x + CONFIG.VIEW_W + 100;
          car.y = camera.y + rng.range(0, CONFIG.VIEW_H);
          car.angle = Math.PI;
        } else if (side === 2) {
          car.x = camera.x + rng.range(0, CONFIG.VIEW_W);
          car.y = camera.y + CONFIG.VIEW_H + 100;
          car.angle = -Math.PI / 2;
        } else {
          car.x = camera.x - 100;
          car.y = camera.y + rng.range(0, CONFIG.VIEW_H);
          car.angle = 0;
        }
        car.speed = 100;
      }
    }
  }
}
