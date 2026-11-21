import { CONFIG } from './config.js';
import { addHeat } from './police.js';

export function updateCombat(world, dt) {
  if (!world.bullets) world.bullets = [];
  if (!world.guards) world.guards = [];
  if (!world.pickups) world.pickups = [];

  const player = world.player;
  const input = world.input;

  // Rate limit shooting: 7 shots per second
  if (!world._lastShotTime) world._lastShotTime = 0;
  const now = world.time;

  if (input && input.mouse && input.mouse.down && player.onFoot) {
    if (now - world._lastShotTime >= 1 / 7) {
      world._lastShotTime = now;
      // Spawn bullet from player towards mouse (world coords = camera + mouse)
      const mouseWorldX = world.camera.x + input.mouse.x;
      const mouseWorldY = world.camera.y + input.mouse.y;
      const angle = Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x) + (Math.random() - 0.5) * 0.08;
      
      world.bullets.push({
        x: player.x + Math.cos(angle) * 16,
        y: player.y + Math.sin(angle) * 16,
        vx: Math.cos(angle) * 720,
        vy: Math.sin(angle) * 720,
        dist: 0,
        maxDist: 460,
        fromPlayer: true
      });

      // Add heat / alert police / peds
      if (now - (world._lastHeatShot || 0) > 0.5) {
        world._lastHeatShot = now;
        addHeat(world, 6, player.x, player.y);
        world.flags.firedAt = true;
      }
    }
  }

  // Melee attack on key 'KeyF' or 'Space' if on foot
  if (input && input.pressed && (input.pressed.has('KeyF') || input.pressed.has('KeyE')) && player.onFoot) {
    // Check melee hit against guards or peds within 35px
    for (let guard of world.guards) {
      if (Math.hypot(guard.x - player.x, guard.y - player.y) < 35) {
        guard.health -= 35;
        guard.state = 'alert';
      }
    }
    for (let ped of world.peds) {
      if (Math.hypot(ped.x - player.x, ped.y - player.y) < 35) {
        ped.health = (ped.health || 100) - 50;
        ped.flee = true;
      }
    }
  }

  // Update bullets
  for (let i = world.bullets.length - 1; i >= 0; i--) {
    const b = world.bullets[i];
    const stepDist = Math.hypot(b.vx * dt, b.vy * dt);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.dist += stepDist;

    let hit = false;
    if (b.dist >= b.maxDist) {
      hit = true;
    } else if (b.fromPlayer) {
      // Check hit guards
      for (let guard of world.guards) {
        if (guard.health > 0 && Math.hypot(guard.x - b.x, guard.y - b.y) < 16) {
          guard.health -= 35;
          guard.state = 'alert';
          hit = true;
          break;
        }
      }
      // Check hit police cars or police
      if (!hit) {
        for (let pCar of world.police) {
          if (Math.hypot(pCar.x - b.x, pCar.y - b.y) < pCar.w * 0.5) {
            pCar.health -= 10;
            hit = true;
            break;
          }
        }
      }
    } else {
      // Guard / enemy bullet hitting player
      if (Math.hypot(player.x - b.x, player.y - b.y) < CONFIG.PLAYER_R + 4) {
        player.health -= 12;
        hit = true;
        if (player.health <= 0) {
          world.state = 'wasted';
        }
      }
    }

    if (hit) {
      world.bullets.splice(i, 1);
    }
  }

  // Update guards (rival guards in Mission 2)
  for (let guard of world.guards) {
    if (guard.health <= 0) continue;
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (dist < 280) {
      guard.state = 'alert';
      const angle = Math.atan2(player.y - guard.y, player.x - guard.x);
      // Keep distance around 130px
      if (dist > 150) {
        guard.x += Math.cos(angle) * 60 * dt;
        guard.y += Math.sin(angle) * 60 * dt;
      } else if (dist < 100) {
        guard.x -= Math.cos(angle) * 50 * dt;
        guard.y -= Math.sin(angle) * 50 * dt;
      }

      // Shoot player periodically
      if (!guard._lastShot) guard._lastShot = 0;
      if (now - guard._lastShot >= 1.4) {
        guard._lastShot = now;
        const shootAngle = angle + (Math.random() - 0.5) * 0.2;
        world.bullets.push({
          x: guard.x + Math.cos(shootAngle) * 14,
          y: guard.y + Math.sin(shootAngle) * 14,
          vx: Math.cos(shootAngle) * 600,
          vy: Math.sin(shootAngle) * 600,
          dist: 0,
          maxDist: 380,
          fromPlayer: false
        });
      }
    }

    if (guard.health <= 0 && !guard._droppedMoney) {
      guard._droppedMoney = true;
      world.pickups.push({
        x: guard.x,
        y: guard.y,
        amount: 150,
        type: 'cash'
      });
    }
  }

  // Clean dead guards
  world.guards = world.guards.filter(g => g.health > 0);

  // Update money pickups collection
  for (let i = world.pickups.length - 1; i >= 0; i--) {
    const pk = world.pickups[i];
    if (Math.hypot(player.x - pk.x, player.y - pk.y) < 24) {
      world.money += pk.amount;
      world.pickups.splice(i, 1);
      world.flags.pickupFx = true;
    }
  }
}

export function drawCombat(ctx, world) {
  // Draw guards
  if (world.guards) {
    for (let g of world.guards) {
      ctx.save();
      ctx.fillStyle = '#883333';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#220000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Health bar above guard
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(g.x - 14, g.y - 20, 28, 4);
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(g.x - 14, g.y - 20, 28 * Math.max(0, g.health / 100), 4);
      ctx.restore();
    }
  }

  // Draw pickups
  if (world.pickups) {
    for (let pk of world.pickups) {
      ctx.save();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y + Math.sin(world.time * 5) * 3, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', pk.x, pk.y + Math.sin(world.time * 5) * 3);
      ctx.restore();
    }
  }

  // Draw bullets
  if (world.bullets) {
    ctx.save();
    ctx.strokeStyle = '#ffff66';
    ctx.lineWidth = 2.5;
    for (let b of world.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
      ctx.stroke();
    }
    ctx.restore();
  }
}
