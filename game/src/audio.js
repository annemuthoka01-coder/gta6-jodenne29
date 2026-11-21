// Cielo Heat - Procedural WebAudio & Sound Engine
let audioCtx = null;
let masterGain = null;
let muted = false;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let sirenStep = 0;
let sirenTimer = null;

function initAudio() {
  if (audioCtx || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 0.4;
    masterGain.connect(audioCtx.destination);
  } catch (e) {
    console.warn('WebAudio not supported:', e);
  }
}

export function ensureAudio() {
  if (!audioCtx && typeof window !== 'undefined') {
    initAudio();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function setMuted(val) {
  muted = val;
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(muted ? 0 : 0.4, audioCtx.currentTime);
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cieloheat-muted', muted ? '1' : '0');
    }
  } catch (e) {}
}

export function getMuted() {
  if (typeof localStorage !== 'undefined') {
    try {
      muted = localStorage.getItem('cieloheat-muted') === '1';
    } catch (e) {}
  }
  return muted;
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}

export function sfx(name) {
  if (typeof window === 'undefined') return;
  ensureAudio();
  if (!audioCtx || !masterGain || muted) return;

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  gain.connect(masterGain);

  if (name === 'shot') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t);
    osc.stop(t + 0.16);
  } else if (name === 'hit') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.linearRampToValueAtTime(30, t + 0.1);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.start(t);
    osc.stop(t + 0.11);
  } else if (name === 'pickup' || name === 'cash') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.setValueAtTime(880, t + 0.08); // A5
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.start(t);
    osc.stop(t + 0.26);
  } else if (name === 'busted') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.6);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
    osc.start(t);
    osc.stop(t + 0.65);
  } else if (name === 'win') {
    osc.type = 'sine';
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(masterGain);
      o.frequency.setValueAtTime(f, t + i * 0.1);
      g.gain.setValueAtTime(0.3, t + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);
      o.start(t + i * 0.1);
      o.stop(t + i * 0.1 + 0.25);
    });
  } else if (name === 'click') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
    osc.start(t);
    osc.stop(t + 0.04);
  }
}

export function startEngine() {
  if (typeof window === 'undefined' || engineOsc) return;
  ensureAudio();
  if (!audioCtx || !masterGain) return;
  try {
    engineOsc = audioCtx.createOscillator();
    engineGain = audioCtx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.setValueAtTime(60, audioCtx.currentTime);
    engineGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    engineOsc.connect(engineGain);
    engineGain.connect(masterGain);
    engineOsc.start();
  } catch (e) {}
}

export function stopEngine() {
  if (engineOsc) {
    try { engineOsc.stop(); } catch (e) {}
    engineOsc = null;
    engineGain = null;
  }
}

export function setEnginePitch(ratio) {
  if (engineOsc && audioCtx) {
    const f = 50 + Math.min(250, Math.abs(ratio) * 180);
    engineOsc.frequency.setValueAtTime(f, audioCtx.currentTime);
  }
}

export function startSiren() {
  if (typeof window === 'undefined' || sirenTimer) return;
  ensureAudio();
  if (!audioCtx || !masterGain) return;
  try {
    sirenOsc = audioCtx.createOscillator();
    sirenGain = audioCtx.createGain();
    sirenOsc.type = 'sine';
    sirenGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    sirenOsc.connect(sirenGain);
    sirenGain.connect(masterGain);
    sirenOsc.start();

    sirenTimer = setInterval(() => {
      if (!sirenOsc || !audioCtx) return;
      sirenStep = 1 - sirenStep;
      const f = sirenStep ? 750 : 550;
      sirenOsc.frequency.setValueAtTime(f, audioCtx.currentTime);
    }, 400);
  } catch (e) {}
}

export function stopSiren() {
  if (sirenTimer) {
    clearInterval(sirenTimer);
    sirenTimer = null;
  }
  if (sirenOsc) {
    try { sirenOsc.stop(); } catch (e) {}
    sirenOsc = null;
    sirenGain = null;
  }
}
