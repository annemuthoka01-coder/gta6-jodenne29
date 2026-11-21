import { drawCombat } from './combat.js';
import { drawHUD } from './hud.js';
import { MISSIONS } from './missions.js';
import { CONFIG, PALETTE } from './config.js';
import { drawPlayer } from './player.js';
import { drawCar } from './vehicles.js';
import { drawPed } from './pedestrians.js';

export function drawWorld(ctx, world) {
  const { camera, city, rng, time, tod } = world;

  ctx.save();
  ctx.clearRect(0, 0, CONFIG.VIEW_W, CONFIG.VIEW_H);

  // Apply camera translation
  ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

  // 1. Ground (Sand and asphalt base)
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, 0, CONFIG.WORLD_W, CONFIG.WORLD_H);

  // Beach water / Sea
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(CONFIG.BEACH_X, 0, CONFIG.WORLD_W - CONFIG.BEACH_X, CONFIG.WORLD_H);

  // 2. Roads (Grid)
  const { BLOCK, ROAD_W } = CONFIG;
  ctx.fillStyle = PALETTE.asphalt;
  for (let y = 0; y < CONFIG.WORLD_H; y += BLOCK) {
    ctx.fillRect(0, y, CONFIG.BEACH_X, ROAD_W);
  }
  for (let x = 0; x < CONFIG.BEACH_X; x += BLOCK) {
    ctx.fillRect(x, 0, ROAD_W, CONFIG.WORLD_H);
  }

  // Road dashed lines
  ctx.strokeStyle = PALETTE.roadLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 16]);

  for (let y = 0; y < CONFIG.WORLD_H; y += BLOCK) {
    ctx.beginPath();
    ctx.moveTo(0, y + ROAD_W / 2);
    ctx.lineTo(CONFIG.BEACH_X, y + ROAD_W / 2);
    ctx.stroke();
  }
  for (let x = 0; x < CONFIG.BEACH_X; x += BLOCK) {
    ctx.beginPath();
    ctx.moveTo(x + ROAD_W / 2, 0);
    ctx.lineTo(x + ROAD_W / 2, CONFIG.WORLD_H);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 3. Docks & Wooden Piers
  ctx.fillStyle = PALETTE.docksWood;
  ctx.fillRect(city.docks.x, city.docks.y, city.docks.w, city.docks.h);

  // 4. Palms & Street Lamps
  for (let palm of city.palms) {
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.arc(palm.x + 4, palm.y + 6, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.palmTrunk;
    ctx.fillRect(palm.x - 2, palm.y - 10, 4, 20);

    ctx.fillStyle = PALETTE.palmGreen;
    ctx.beginPath();
    ctx.arc(palm.x, palm.y - 14, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let lamp of city.lamps) {
    ctx.fillStyle = PALETTE.lampPole;
    ctx.fillRect(lamp.x - 2, lamp.y - 15, 4, 30);
    ctx.fillStyle = tod === 'night' ? PALETTE.lampBulb : '#cccccc';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y - 16, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Buildings with Shadows
  for (let b of city.buildings) {
    // Drop shadow
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(b.x + 6, b.y + 6, b.w, b.h);

    // Wall
    ctx.fillStyle = b.wall || PALETTE.buildingWall;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Roof
    ctx.fillStyle = b.roof || PALETTE.roofs[0];
    ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);

    // Architectural details (Windows)
    ctx.fillStyle = '#333333';
    for (let wx = b.x + 16; wx < b.x + b.w - 16; wx += 24) {
      ctx.fillRect(wx, b.y + 14, 8, 12);
      ctx.fillRect(wx, b.y + b.h - 26, 8, 12);
    }
  }

  // 5.5. Pedestrians
  for (let ped of world.peds) {
    drawPed(ctx, ped);
  }

  // 6. Cars (Parked, Traffic, Police, Player's)
  for (let car of world.cars) {
    drawCar(ctx, car);
  }

  // 7. Player (only when on foot)
  if (world.player.onFoot) {
    drawPlayer(ctx, world);
  }

  // Busted meter indicator ring around player/target if busted > 0
  if (world.busted > 0) {
    const target = world.player;
    ctx.save();
    ctx.strokeStyle = '#0055ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const radius = 24;
    const endAngle = (world.busted / 100) * Math.PI * 2 - Math.PI / 2;
    ctx.arc(target.x, target.y, radius, -Math.PI / 2, endAngle);
    ctx.stroke();
    ctx.restore();
  }

  // Draw Guards & Combat / Pickups
  drawCombat(ctx, world);

  // Draw Mission Objective Marker or Garage marker
  const mState = world.missionState;
  let objX = 360, objY = 360, objRadius = 40, objColor = "#ffd700";
  if (mState && mState.activeMissionIndex >= 0) {
    const mission = MISSIONS[mState.activeMissionIndex];
    const step = mission.steps[mState.currentStepIndex];
    objX = step.x;
    objY = step.y;
    objRadius = step.radius;
    objColor = step.type === "deliver" || step.type === "escape" ? "#00ff66" : "#ffd700";
  }

  ctx.save();
  ctx.strokeStyle = objColor;
  ctx.lineWidth = 3;
  ctx.fillStyle = objColor === "#ffd700" ? "rgba(255, 215, 0, 0.25)" : "rgba(0, 255, 102, 0.25)";
  ctx.beginPath();
  const pulseR = objRadius + Math.sin(world.time * 6) * 6;
  ctx.arc(objX, objY, Math.max(10, pulseR), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 8. Day / Night / Golden Hour overlay tint
  if (tod === 'night') {
    ctx.fillStyle = 'rgba(10, 20, 50, 0.45)';
    ctx.fillRect(camera.x, camera.y, CONFIG.VIEW_W, CONFIG.VIEW_H);
  } else if (tod === 'golden') {
    ctx.fillStyle = 'rgba(255, 150, 50, 0.12)';
    ctx.fillRect(camera.x, camera.y, CONFIG.VIEW_W, CONFIG.VIEW_H);
  }

  ctx.restore();
}

// Additional rendering polish for night and effects in render.js
