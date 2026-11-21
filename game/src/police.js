import { CONFIG } from './config.js';
import { makeCar, CAR_MODELS } from './vehicles.js';
import { isBlocked } from './city.js';

export function addHeat(world, amount, x, y) {
  world.heat = Math.min(100, (world.heat || 0) + amount);
  // Optional alert effect or sound trigger hook
}

export function updateWanted(world, dt) {
  if (world.heat === undefined) world.heat = 0;
  
  // Calculate stars (0 to 5)
  world.wanted = world.heat <= 0 ? 0 : Math.min(5, 1 + Math.floor(world.heat / 25));

  // Heat decay if no police are actively chasing or player is out of sight / hiding
  let policeVisible = false;
  for (let pCar of world.police) {
    const dist = Math.hypot(pCar.x - world.player.x, pCar.y - world.player.y);
    if (dist < 480) {
      policeVisible = true;
      break;
    }
  }

  if (!policeVisible && world.wanted > 0) {
    // Decay heat when out of sight
    world.heat = Math.max(0, world.heat - 2.5 * dt);
    if (world.heat === 0) {
      world.police = [];
    }
  }
}

export function updatePolice(world, dt) {
  const rng = world.rng;
  const player = world.player;
  const targetStars = world.wanted;

  // Manage police car count based on wanted stars
  const desiredPoliceCount = targetStars > 0 ? Math.min(4, targetStars) : 0;

  if (world.police.length < desiredPoliceCount && rng.chance(0.05)) {
    // Spawn police car on a road 500-700px away from player
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(500, 700);
    const spawnX = player.x + Math.cos(angle) * dist;
    const spawnY = player.y + Math.sin(angle) * dist;

    // Clamp to world bounds
    const px = Math.max(100, Math.min(CONFIG.BEACH_X - 100, spawnX));
    const py = Math.max(100, Math.min(CONFIG.WORLD_H - 100, spawnY));

    const pCar = makeCar(px, py, rng.range(0, Math.PI * 2), 'Solano', 'police', 0);
    pCar.health = 150;
    pCar.maxHealth = 150;
    world.cars.push(pCar);
    world.police.push(pCar);
  }

  // Clean up destroyed or removed police
  world.police = world.police.filter(p => world.cars.includes(p) && p.health > 0);

  // Busted meter initialization
  if (world.busted === undefined) world.busted = 0;

  let nearPolice = false;
  let slowPlayer = false;
  if (!player.onFoot && player.car) {
    slowPlayer = Math.abs(player.car.speed) < 30;
  } else if (player.onFoot) {
    slowPlayer = true;
  }

  // Update each police car AI
  for (let pCar of world.police) {
    const distToPlayer = Math.hypot(player.x - pCar.x, player.y - pCar.y);

    if (distToPlayer < 70 && slowPlayer && world.wanted > 0) {
      nearPolice = true;
    }

    // Steer towards player / player car
    const targetX = player.x;
    const targetY = player.y;
    const angleToTarget = Math.atan2(targetY - pCar.y, targetX - pCar.x);

    // Smooth angle adjustment
    let angleDiff = angleToTarget - pCar.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    pCar.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 2.5 * dt);

    // Accelerate / Ram player
    const model = CAR_MODELS[pCar.model] || CAR_MODELS.Solano;
    const targetSpeed = distToPlayer > 120 ? model.topSpeed * 0.85 : model.topSpeed;
    if (pCar.speed < targetSpeed) {
      pCar.speed += model.accel * dt;
    } else {
      pCar.speed *= 0.98;
    }

    pCar.x += Math.cos(pCar.angle) * pCar.speed * dt;
    pCar.y += Math.sin(pCar.angle) * pCar.speed * dt;

    // Building collision for police
    if (isBlocked(pCar.x, pCar.y, world.city)) {
      pCar.speed *= -0.5;
      pCar.angle += rng.range(-1, 1);
    }

    // Collision with player car or player on foot
    if (!player.onFoot && player.car === pCar) {
      // shouldn't happen
    } else if (!player.onFoot && player.car) {
      const pPlayerCar = player.car;
      const dCar = Math.hypot(pPlayerCar.x - pCar.x, pPlayerCar.y - pCar.y);
      if (dCar < (pPlayerCar.w + pCar.w) * 0.5) {
        // Ram impact
        pCar.health -= 5;
        pPlayerCar.health -= 8;
        addHeat(world, 1, pCar.x, pCar.y);
        if (pPlayerCar.health <= 0) {
          world.state = 'wasted';
        }
      }
    } else if (player.onFoot) {
      const dFoot = Math.hypot(player.x - pCar.x, player.y - pCar.y);
      if (dFoot < 35 && Math.abs(pCar.speed) > 40) {
        player.health -= 50;
        addHeat(world, 20, player.x, player.y);
        if (player.health <= 0) {
          world.state = 'wasted';
        }
      }
    }
  }

  // Busted logic
  if (nearPolice && world.wanted > 0) {
    world.busted = Math.min(100, world.busted + dt * 45); // fills in ~2.2 seconds
    if (world.busted >= 100) {
      world.state = 'busted';
    }
  } else {
    world.busted = Math.max(0, world.busted - dt * 60);
  }

  // Check player health / wasted
  if (player.health <= 0 || (!player.onFoot && player.car && player.car.health <= 0)) {
    world.state = 'wasted';
  }
}
