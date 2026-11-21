// Player character on-foot movement, collision, and rendering.
import { CONFIG, PALETTE } from './config.js';
import { input } from './input.js';
import { isBlocked } from './city.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    angle: 0,
    health: 100,
    maxHealth: 100,
    car: null,
    onFoot: true
  };
}

export function updatePlayer(world, dt) {
  const player = world.player;
  if (!player.onFoot) return;

  let dx = 0;
  let dy = 0;

  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) dy -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) dy += 1;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) dx -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;

    const running = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
    const speed = running ? CONFIG.RUN_SPEED : CONFIG.WALK_SPEED;

    player.angle = Math.atan2(dy, dx);

    const stepX = dx * speed * dt;
    const stepY = dy * speed * dt;
    const r = CONFIG.PLAYER_R;

    if (!isBlocked(player.x + stepX + Math.sign(stepX) * r, player.y, world.city) &&
        !isBlocked(player.x + stepX + Math.sign(stepX) * r, player.y - r, world.city) &&
        !isBlocked(player.x + stepX + Math.sign(stepX) * r, player.y + r, world.city)) {
      player.x += stepX;
    }

    if (!isBlocked(player.x, player.y + stepY + Math.sign(stepY) * r, world.city) &&
        !isBlocked(player.x - r, player.y + stepY + Math.sign(stepY) * r, world.city) &&
        !isBlocked(player.x + r, player.y + stepY + Math.sign(stepY) * r, world.city)) {
      player.y += stepY;
    }
  }

  // Clamp within world bounds
  player.x = Math.max(20, Math.min(CONFIG.WORLD_W - 20, player.x));
  player.y = Math.max(20, Math.min(CONFIG.WORLD_H - 20, player.y));
}

export function drawPlayer(ctx, world) {
  const p = world.player;
  const r = CONFIG.PLAYER_R;

  // Shadow
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.arc(p.x, p.y + 3, r + 1, 0, Math.PI * 2);
  ctx.fill();

  // Body / Clothes
  ctx.fillStyle = PALETTE.playerShirt;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Head / Skin
  ctx.fillStyle = PALETTE.playerSkin;
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.angle) * 3, p.y + Math.sin(p.angle) * 3, r * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Direction indicator tick
  ctx.strokeStyle = PALETTE.playerPants;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * (r + 4), p.y + Math.sin(p.angle) * (r + 4));
  ctx.stroke();
}
