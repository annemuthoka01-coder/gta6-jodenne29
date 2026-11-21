import { CONFIG, PALETTE } from './config.js';

export const CAR_MODELS = {
  Solano: { name: 'Solano', w: 32, h: 64, colors: ['#e63946', '#f1faee', '#a8dadc', '#457b9d'], topSpeed: 280, accel: 180, reverse: 100, turnRate: 3.2, friction: 0.96 },
  Brisa: { name: 'Brisa', w: 34, h: 68, colors: ['#1d3557', '#457b9d', '#e9c46a', '#264653'], topSpeed: 250, accel: 150, reverse: 90, turnRate: 2.9, friction: 0.95 },
  Carguero: { name: 'Carguero', w: 38, h: 76, colors: ['#2a9d8f', '#e76f51', '#f4a261', '#264653'], topSpeed: 210, accel: 120, reverse: 80, turnRate: 2.4, friction: 0.93 },
  Vuelco: { name: 'Vuelco', w: 40, h: 80, colors: ['#ffffff', '#adb5bd', '#495057', '#343a40'], topSpeed: 190, accel: 100, reverse: 70, turnRate: 2.2, friction: 0.92 },
  Relampago: { name: 'Relampago', w: 30, h: 62, colors: ['#ffb703', '#fb8500', '#023047', '#8ecae6'], topSpeed: 320, accel: 220, reverse: 120, turnRate: 3.6, friction: 0.97 }
};

export function makeCar(x, y, angle = 0, modelName = 'Solano', kind = 'parked', colorIndex = 0) {
  const model = CAR_MODELS[modelName] || CAR_MODELS.Solano;
  const color = model.colors[colorIndex % model.colors.length];
  return {
    x,
    y,
    angle,
    speed: 0,
    w: model.w,
    h: model.h,
    color,
    model: model.name,
    kind, // 'parked' | 'traffic' | 'player' | 'police'
    health: 100,
    maxHealth: 100,
    driver: null,
    steerAngle: 0
  };
}

export function stepCarControl(car, ctrl, dt) {
  const model = CAR_MODELS[car.model] || CAR_MODELS.Solano;

  // Steering
  if (ctrl.left) car.angle -= model.turnRate * (Math.abs(car.speed) / model.topSpeed + 0.3) * dt * (car.speed >= 0 ? 1 : -1);
  if (ctrl.right) car.angle += model.turnRate * (Math.abs(car.speed) / model.topSpeed + 0.3) * dt * (car.speed >= 0 ? 1 : -1);

  // Acceleration / Braking / Reverse
  if (ctrl.up) {
    car.speed += model.accel * dt;
    if (car.speed > model.topSpeed) car.speed = model.topSpeed;
  } else if (ctrl.down) {
    if (car.speed > 10) {
      car.speed -= model.accel * 1.8 * dt; // Brake
    } else {
      car.speed -= model.reverse * dt;
      if (car.speed < -model.reverse) car.speed = -model.reverse;
    }
  } else {
    // Natural friction
    car.speed *= Math.pow(model.friction, dt * 60);
    if (Math.abs(car.speed) < 2) car.speed = 0;
  }

  // Handbrake
  if (ctrl.hand) {
    car.speed *= Math.pow(0.85, dt * 60);
  }

  // Move car along its angle
  const forwardX = Math.cos(car.angle);
  const forwardY = Math.sin(car.angle);

  car.x += forwardX * car.speed * dt;
  car.y += forwardY * car.speed * dt;
}

export function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  const hw = car.w / 2;
  const hh = car.h / 2;

  // Shadow
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.roundRect(-hw + 2, -hh + 3, car.w, car.h, 6);
  ctx.fill();

  // Wheels
  ctx.fillStyle = '#111215';
  const wheelW = 6;
  const wheelH = 14;
  ctx.fillRect(-hw - 2, -hh + 8, wheelW, wheelH);
  ctx.fillRect(hw - 4, -hh + 8, wheelW, wheelH);
  ctx.fillRect(-hw - 2, hh - 22, wheelW, wheelH);
  ctx.fillRect(hw - 4, hh - 22, wheelW, wheelH);

  // Car Body
  ctx.fillStyle = car.kind === 'police' ? '#1c2833' : car.color;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, car.w, car.h, 6);
  ctx.fill();

  // Police lights or roof accent
  if (car.kind === 'police') {
    ctx.fillStyle = '#0044ff';
    ctx.fillRect(-hw + 4, -4, 10, 8);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(hw - 14, -4, 10, 8);
  } else {
    // Roof / Cabin
    ctx.fillStyle = PALETTE.asphaltDark;
    ctx.beginPath();
    ctx.roundRect(-hw + 4, -hh + 14, car.w - 8, car.h - 28, 4);
    ctx.fill();

    // Windshield & Rear window
    ctx.fillStyle = '#8ecae6';
    ctx.fillRect(-hw + 6, -hh + 16, car.w - 12, 10);
    ctx.fillRect(-hw + 6, hh - 26, car.w - 12, 8);
  }

  // Headlights
  ctx.fillStyle = '#ffeb80';
  ctx.fillRect(-hw + 2, -hh - 2, 6, 4);
  ctx.fillRect(car.w - hw - 8, -hh - 2, 6, 4);

  // Taillights
  ctx.fillStyle = '#d90429';
  ctx.fillRect(-hw + 2, hh - 2, 6, 3);
  ctx.fillRect(car.w - hw - 8, hh - 2, 6, 3);

  ctx.restore();
}
