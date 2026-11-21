import { CONFIG, PALETTE } from './config.js';
import { MISSIONS } from './missions.js';

export function drawHUD(ctx, world) {
  const player = world.player;
  const camera = world.camera;

  ctx.save();
  // Switch to screen space coordinates (fixed to viewport)
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Top-Left Panel: Cash, Health, Speed
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(16, 16, 220, 96);
  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 220, 96);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`CASH: $${world.money || 0}`, 28, 42);

  // Health bar
  ctx.fillStyle = '#333333';
  ctx.fillRect(28, 56, 196, 14);
  const hpRatio = Math.max(0, Math.min(1, player.health / 100));
  ctx.fillStyle = hpRatio > 0.3 ? '#00cc44' : '#cc2222';
  ctx.fillRect(28, 56, 196 * hpRatio, 14);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 56, 196, 14);

  ctx.fillStyle = '#ffffff';
  ctx.font = '12px monospace';
  ctx.fillText(`HEALTH: ${Math.round(player.health)}%`, 34, 68);

  // Speedometer
  let speedKmh = 0;
  if (!player.onFoot && player.car) {
    speedKmh = Math.round(Math.abs(player.car.speed) * 0.75);
  } else {
    speedKmh = Math.round(CONFIG.WALK_SPEED * 0.4);
  }
  ctx.fillText(`SPEED: ${speedKmh} km/h`, 28, 98);

  // 2. Top-Centre: Objective text & Timer
  const mState = world.missionState;
  let objText = "Visit Lu's Garage (Gold marker) or roam Cielo Bay";
  let timeText = "";

  if (mState && mState.activeMissionIndex >= 0) {
    const mission = MISSIONS[mState.activeMissionIndex];
    const step = mission.steps[mState.currentStepIndex];
    objText = `${mission.title}: ${step.text}`;
    if (step.timer && step.timer > 0) {
      timeText = `TIME: ${Math.ceil(mState.timer)}s`;
    }
  } else if (mState && mState.completed) {
    objText = "Mission Complete! Return to garage for next.";
  } else if (mState && mState.failed) {
    objText = "Mission Failed! Return to garage to retry.";
  }

  const textWidth = ctx.measureText(objText).width + 40;
  const boxX = (CONFIG.VIEW_W - textWidth) / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(boxX, 16, textWidth, timeText ? 52 : 32);
  ctx.strokeStyle = '#666666';
  ctx.strokeRect(boxX, 16, textWidth, timeText ? 52 : 32);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(objText, CONFIG.VIEW_W / 2, 38);

  if (timeText) {
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(timeText, CONFIG.VIEW_W / 2, 58);
  }

  // 3. Top-Right: Wanted Stars
  const wanted = Math.round(world.wanted || 0);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(CONFIG.VIEW_W - 160, 16, 144, 36);
  ctx.strokeStyle = '#444444';
  ctx.strokeRect(CONFIG.VIEW_W - 160, 16, 144, 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText("WANTED:", CONFIG.VIEW_W - 150, 39);

  for (let s = 0; s < 5; s++) {
    const sx = CONFIG.VIEW_W - 88 + s * 16;
    ctx.fillStyle = s < wanted ? '#ffd700' : '#444444';
    ctx.font = '16px monospace';
    ctx.fillText('★', sx, 41);
  }

  // 4. Circular Minimap (Top-Right, below wanted stars)
  const mapX = CONFIG.VIEW_W - 90;
  const mapY = 140;
  const mapRadius = 74;

  ctx.save();
  ctx.beginPath();
  ctx.arc(mapX, mapY, mapRadius, 0, Math.PI * 2);
  ctx.clip();

  // Minimap background (sea / land)
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(mapX - mapRadius, mapY - mapRadius, mapRadius * 2, mapRadius * 2);

  const mapScale = 0.055; // world to minimap scale
  const targetX = player.x;
  const targetY = player.y;

  ctx.save();
  ctx.translate(mapX, mapY);
  ctx.scale(mapScale, mapScale);
  ctx.translate(-targetX, -targetY);

  // Draw city roads on minimap
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 14;
  for (let i = 0; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CONFIG.BLOCK, 0);
    ctx.lineTo(i * CONFIG.BLOCK, CONFIG.WORLD_H);
    ctx.stroke();
  }
  for (let j = 0; j <= 7; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j * CONFIG.BLOCK);
    ctx.lineTo(CONFIG.WORLD_W, j * CONFIG.BLOCK);
    ctx.stroke();
  }

  // Draw objective point on minimap
  if (mState && mState.activeMissionIndex >= 0) {
    const mission = MISSIONS[mState.activeMissionIndex];
    const step = mission.steps[mState.currentStepIndex];
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(step.x, step.y, 160, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Garage marker
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(360, 360, 160, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw police cars on minimap
  ctx.fillStyle = '#ff3333';
  for (let p of world.police) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 80, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw player on minimap
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 100, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();

  // Minimap border ring
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(mapX, mapY, mapRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 5. Dialogue Box (Bottom-Centre)
  if (mState && mState.dialogue) {
    const diag = mState.dialogue;
    const boxW = 600;
    const boxH = 75;
    const diagX = (CONFIG.VIEW_W - boxW) / 2;
    const diagY = CONFIG.VIEW_H - 100;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(diagX, diagY, boxW, boxH);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(diagX, diagY, boxW, boxH);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(diag.speaker.toUpperCase(), diagX + 16, diagY + 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.fillText(diag.text, diagX + 16, diagY + 48);
  }

  // 6. Controls hint bottom-left (first minute)
  if (world.time < 60 && (!mState || mState.activeMissionIndex < 0)) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(16, CONFIG.VIEW_H - 75, 340, 60);
    ctx.strokeStyle = '#555555';
    ctx.strokeRect(16, CONFIG.VIEW_H - 75, 340, 60);

    ctx.fillStyle = '#cccccc';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText("WASD/Arrows: Move/Drive | F/E: Enter Car / Melee", 24, CONFIG.VIEW_H - 48);
    ctx.fillText("Mouse Aim + Click: Shoot | Visit Garage for Mission 1", 24, CONFIG.VIEW_H - 28);
  }

  ctx.restore();
}

export function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(5, 5, 15, 0.85)';
  ctx.fillRect(0, 0, 1280, 720);

  ctx.shadowColor = '#ff6600';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#ffaa33';
  ctx.font = '900 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CIELO HEAT', 640, 180);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#00e5ff';
  ctx.font = '600 22px sans-serif';
  ctx.fillText('Cielo Bay. Dario Venn drives. Lu Prado pays. The Marrow brothers are owed.', 640, 240);

  ctx.fillStyle = '#ffffff';
  ctx.font = '500 18px sans-serif';
  ctx.fillText('[Enter] Start New Game', 640, 320);
  if (world.hasSave) {
    ctx.fillStyle = '#00ffaa';
    ctx.fillText('[C] Continue Saved Game', 640, 360);
  }

  ctx.fillStyle = '#cccccc';
  ctx.font = '14px sans-serif';
  ctx.fillText('CONTROLS: WASD / Arrows to Drive & Walk | E to Enter/Exit Car | Mouse to Aim | Click to Shoot', 640, 440);
  ctx.fillText('F to Melee / Carjack | P to Pause | M to Mute Audio', 640, 470);

  ctx.fillStyle = '#888888';
  ctx.font = '12px sans-serif';
  ctx.fillText('An original game built for make.fun', 640, 660);
  ctx.textAlign = 'left';
}

export function drawOverlay(ctx, world) {
  if (world.state === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 640, 340);
    ctx.font = '20px sans-serif';
    ctx.fillText('Press [P] or [Esc] to resume', 640, 390);
    ctx.textAlign = 'left';
  } else if (world.state === 'busted') {
    ctx.fillStyle = 'rgba(20,0,0,0.8)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#ff3333';
    ctx.font = '900 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED', 640, 320);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText('Fined $100 and stripped of illegal gear.', 640, 380);
    ctx.fillText('Press [R] to continue', 640, 430);
    ctx.textAlign = 'left';
  } else if (world.state === 'wasted') {
    ctx.fillStyle = 'rgba(10,0,0,0.85)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#ff2222';
    ctx.font = '900 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASTED', 640, 320);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText('Wake up at the Cielo Bay clinic.', 640, 380);
    ctx.fillText('Press [R] to respawn', 640, 430);
    ctx.textAlign = 'left';
  }
}
