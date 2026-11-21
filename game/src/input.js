// Input handling for keyboard and mouse.

export const input = {
  keys: new Set(),
  pressed: new Set(),
  mouse: { x: 0, y: 0, down: false }
};

export function attachInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
      if (!input.keys.has(e.code)) {
        input.pressed.add(e.code);
      }
      input.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.mouse.x = (e.clientX - rect.left) * scaleX;
    input.mouse.y = (e.clientY - rect.top) * scaleY;
  });

  canvas.addEventListener('mousedown', (e) => {
    input.mouse.down = true;
  });

  window.addEventListener('mouseup', (e) => {
    input.mouse.down = false;
  });
}

export function endFrameInput() {
  input.pressed.clear();
}
