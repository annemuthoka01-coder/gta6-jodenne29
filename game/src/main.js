import { CONFIG, PALETTE } from './config.js';
import { input, attachInput, endFrameInput } from './input.js';
import { createWorld, stepWorld } from './world.js';
import { drawWorld } from './render.js';
import { setupShot } from './shots.js';
import { drawHUD } from './hud.js';

function getUrlParam(name, defaultVal) {
  const params = new URLSearchParams(window.location.search);
  const val = params.get(name);
  return val !== null ? val : defaultVal;
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  if (!canvas) {
    console.error('Canvas #game not found');
    return;
  }
  const ctx = canvas.getContext('2d');
  attachInput(canvas);

  const seedStr = getUrlParam('seed', '7');
  const seed = parseInt(seedStr, 10) || 7;
  const shotName = getUrlParam('shot', null);

  const world = createWorld(seed);

  if (shotName !== null) {
    setupShot(world, shotName, seed);
    resizeAndDraw(ctx, canvas, world);
    window.__shotReady = true;
    return;
  }

  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    stepWorld(world, dt);
    resizeAndDraw(ctx, canvas, world);
    endFrameInput();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
});

function resizeAndDraw(ctx, canvas, world) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const displayW = window.innerWidth;
  const displayH = window.innerHeight;

  if (canvas.width !== Math.round(displayW * dpr) || canvas.height !== Math.round(displayH * dpr)) {
    canvas.width = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);
  }

  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = PALETTE.asphaltDark || '#1a1a1a';
  ctx.fillRect(0, 0, displayW, displayH);

  const scale = Math.min(displayW / CONFIG.VIEW_W, displayH / CONFIG.VIEW_H);
  const viewW = CONFIG.VIEW_W * scale;
  const viewH = CONFIG.VIEW_H * scale;
  const offsetX = (displayW - viewW) / 2;
  const offsetY = (displayH - viewH) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.rect(0, 0, CONFIG.VIEW_W, CONFIG.VIEW_H);
  ctx.clip();

  drawWorld(ctx, world);
  drawHUD(ctx, world);

  ctx.restore();
  ctx.restore();
}
