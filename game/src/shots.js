import { CONFIG } from './config.js';
import { stepWorld } from './world.js';
import { startMission, MISSIONS } from './missions.js';
import { makeCar } from './vehicles.js';

export function setupShot(world, name, seed) {
  world.state = 'playing';
  
  if (name === 'cover') {
    world.money = 1250;
    
    // Spawn a coupe on coast road (vertical road nearest beach: x = 10 * BLOCK = 3600 or near BEACH_X)
    const carX = CONFIG.BEACH_X - 120;
    const carY = 1200;
    const car = makeCar(carX, carY, -Math.PI / 2, 'coupe', 'player', 0);
    car.speed = 73.33; // 73.33 * 0.75 ≈ 55 km/h
    world.cars.push(car);
    world.player.x = car.x;
    world.player.y = car.y;
    world.player.onFoot = false;
    world.player.car = car;
    world.cameraTarget = car;

    // 2-3 traffic cars on the same road in frame
    for (let i = 1; i <= 3; i++) {
      const tCar = makeCar(carX, carY - i * 140, -Math.PI / 2, 'sedan', 'traffic', 0);
      tCar.speed = 60;
      world.cars.push(tCar);
    }

    // One police car on the same road behind (further south, e.g. +160px) in frame
    const pCar = makeCar(carX, carY + 180, -Math.PI / 2, 'Solano', 'police', 0);
    pCar.speed = 80;
    world.cars.push(pCar);
    world.police.push(pCar);

  } else if (name === 'mission') {
    world.money = 500;
    
    // Mission 1 active at pickup step: Lu's garage is at (360, 360). Stand ~30px away.
    world.player.x = 360 - 30;
    world.player.y = 360;
    world.player.onFoot = true;
    world.player.car = null;
    world.cameraTarget = world.player;
    
    startMission(world, 0); // Mission 1 is index 0 ("First Run")
    
    // 3+ pedestrians nearby
    for (let i = 0; i < 4; i++) {
      world.peds.push({
        x: 360 + (i === 0 ? 40 : i === 1 ? -40 : i === 2 ? 60 : -60),
        y: 360 + (i % 2 === 0 ? 50 : -50),
        vx: 10,
        vy: 0,
        speed: 30,
        angle: 0,
        health: 100,
        kind: 'normal'
      });
    }

    // Lu's dialogue line visible
    if (MISSIONS[0].introLines && MISSIONS[0].introLines.length > 0) {
      world.missionState.dialogue = {
        speaker: MISSIONS[0].introLines[0].speaker,
        text: MISSIONS[0].introLines[0].text,
        until: Infinity
      };
    }

  } else if (name === 'chase') {
    world.money = 850;

    // Straight horizontal road heading east (e.g., y = 1080)
    const carX = 1400;
    const carY = 1080;
    const car = makeCar(carX, carY, 0, 'sedan', 'player', 0);
    car.speed = 86.66; // 86.66 * 0.75 ≈ 65 km/h
    world.cars.push(car);
    world.player.x = car.x;
    world.player.y = car.y;
    world.player.onFoot = false;
    world.player.car = car;
    world.cameraTarget = car;

    // TWO police cars directly behind on the same lane (70px and 140px back)
    for (let i = 0; i < 2; i++) {
      const pCar = makeCar(carX - 70 - i * 70, carY, 0, 'Solano', 'police', 0);
      pCar.speed = 82;
      world.cars.push(pCar);
      world.police.push(pCar);
    }

  } else if (name === 'night') {
    world.money = 2100;

    world.player.x = 1800;
    world.player.y = 1400;
    world.player.onFoot = true;
    world.player.car = null;
    world.cameraTarget = world.player;

    const parkedCar = makeCar(1850, 1380, 0, 'sports', 'parked', 0);
    parkedCar.speed = 0;
    world.cars.push(parkedCar);
  }

  // Run autopilot simulation steps to bring world alive
  for (let i = 0; i < 40; i++) {
    stepWorld(world, 1 / 30);
  }

  // FINAL STAGING as the LAST thing before returning (so main.js draws right after)
  if (name === 'cover') {
    world.tod = 'golden';
    world.time = 18 * 3600; // 6 PM golden hour
    world.heat = 30; // 2 stars (1 + floor(30/25) = 2)
    world.wanted = 2;
    // ensure speed fields remain
    if (world.player.car) world.player.car.speed = 73.33;
  } else if (name === 'mission') {
    world.tod = 'day';
    world.time = 10 * 3600;
    world.heat = 0;
    world.wanted = 0;
    world.player.x = 360 - 30;
    world.player.y = 360;
    world.player.onFoot = true;
    world.player.car = null;
    world.cameraTarget = world.player;
    if (MISSIONS[0].introLines) {
      world.missionState.dialogue = {
        speaker: MISSIONS[0].introLines[0].speaker,
        text: MISSIONS[0].introLines[0].text,
        until: Infinity
      };
    }
  } else if (name === 'chase') {
    world.tod = 'day';
    world.time = 14 * 3600;
    world.heat = 85; // 4 stars (1 + floor(85/25) = 4)
    world.wanted = 4;
    if (world.player.car) world.player.car.speed = 86.66;
  } else if (name === 'night') {
    world.tod = 'night';
    world.time = 22 * 3600;
    world.heat = 15;
    world.wanted = 1;
  }
}
