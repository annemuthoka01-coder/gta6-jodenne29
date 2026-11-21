import { CONFIG } from './config.js';

export function spawnPeds(world, count = 35) {
  const peds = [];
  const rng = world.rng;
  const { WORLD_W, WORLD_H, BLOCK, ROAD_W, BEACH_X } = CONFIG;

  const shirtColors = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261', '#9b5de5', '#f15bb5', '#00bbf9', '#ffffff', '#343a40'];

  let attempts = 0;
  while (peds.length < count && attempts < count * 20) {
    attempts++;
    const x = rng.range(50, BEACH_X - 50);
    const y = rng.range(50, WORLD_H - 50);

    // Make sure it's on a sidewalk (near road edges, not on road or inside building)
    const rx = x % BLOCK;
    const ry = y % BLOCK;
    const roadHalf = ROAD_W / 2;
    const onSidewalk = (rx >= roadHalf - 18 && rx <= roadHalf + 4) || (rx >= BLOCK - roadHalf - 4 && rx <= BLOCK - roadHalf + 18) ||
                       (ry >= roadHalf - 18 && ry <= roadHalf + 4) || (ry >= BLOCK - roadHalf - 4 && ry <= BLOCK - roadHalf + 18);

    if (onSidewalk) {
      let blocked = false;
      for (let b of world.city.buildings) {
        if (x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        peds.push({
          x,
          y,
          vx: 0,
          vy: 0,
          speed: rng.range(35, 65),
          angle: rng.range(0, Math.PI * 2),
          shirtColor: rng.pick(shirtColors),
          state: 'walk', // 'walk' | 'flee' | 'down'
          downTimer: 0,
          wanderTimer: rng.range(2, 6)
        });
      }
    }
  }
  world.peds = peds;
}

export function updatePeds(world, dt) {
  const rng = world.rng;
  const player = world.player;

  for (let i = world.peds.length - 1; i >= 0; i--) {
    const ped = world.peds[i];

    if (ped.state === 'down') {
      ped.downTimer += dt;
      if (ped.downTimer > 12) {
        world.peds.splice(i, 1);
      }
      continue;
    }

    // Check danger (player driving fast nearby, police chase, gunfire)
    let dangerX = 0;
    let dangerY = 0;
    let isDanger = false;

    const distPlayer = Math.hypot(player.x - ped.x, player.y - ped.y);
    if (distPlayer < 180) {
      if (!player.onFoot && player.car && Math.abs(player.car.speed) > 60) {
        isDanger = true;
        dangerX = player.car.x;
        dangerY = player.car.y;
      } else if (world.heat > 30) {
        isDanger = true;
        dangerX = player.x;
        dangerY = player.y;
      }
    }

    if (isDanger) {
      ped.state = 'flee';
      const angleToDanger = Math.atan2(ped.y - dangerY, ped.x - dangerX);
      ped.angle = angleToDanger + rng.range(-0.5, 0.5);
      const fleeSpeed = 130;
      ped.x += Math.cos(ped.angle) * fleeSpeed * dt;
      ped.y += Math.sin(ped.angle) * fleeSpeed * dt;
    } else {
      ped.state = 'walk';
      ped.wanderTimer -= dt;
      if (ped.wanderTimer <= 0) {
        ped.wanderTimer = rng.range(3, 7);
        ped.angle += rng.range(-1.2, 1.2);
      }

      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
    }

    // Collision with buildings / world boundaries
    if (ped.x < 30 || ped.y < 30 || ped.x >= CONFIG.BEACH_X || ped.y >= CONFIG.WORLD_H) {
      ped.angle += Math.PI;
    }

    for (let b of world.city.buildings) {
      if (ped.x >= b.x - 2 && ped.x <= b.x + b.w + 2 && ped.y >= b.y - 2 && ped.y <= b.y + b.h + 2) {
        ped.x -= Math.cos(ped.angle) * ped.speed * dt * 2;
        ped.y -= Math.sin(ped.angle) * ped.speed * dt * 2;
        ped.angle += rng.range(1, 3);
        break;
      }
    }

    // Collision with player car moving fast
    if (!player.onFoot && player.car) {
      const car = player.car;
      const d = Math.hypot(car.x - ped.x, car.y - ped.y);
      if (d < 24 && Math.abs(car.speed) > 40) {
        ped.state = 'down';
        ped.downTimer = 0;
        // Add heat and murder/hitcrime
        if (typeof world.addHeat === 'function') {
          world.addHeat(25, ped.x, ped.y);
        } else {
          world.heat = Math.min(100, world.heat + 25);
        }
      }
    }
  }

  // Respawn peds if count drops low
  if (world.peds.length < 25 && rng.chance(0.05)) {
    spawnPeds(world, 35);
  }
}

export function drawPed(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);

  if (ped.state === 'down') {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ped.shirtColor;
    ctx.fillRect(-6, -4, 12, 8);
    ctx.fillStyle = '#ffccaa';
    ctx.fillRect(6, -3, 5, 6);
  } else {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = ped.shirtColor;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#ffccaa';
    ctx.beginPath();
    ctx.arc(0, -2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
