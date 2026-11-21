import { CONFIG } from './config.js';

export const MISSIONS = [
  {
    id: 1,
    title: "Mission 1: First Run",
    giver: "Lucia Prado",
    introLines: [
      { speaker: "Lu Prado", text: "Dario! We need to move fast. Pick up the package at the garage and deliver it across town." }
    ],
    steps: [
      {
        type: 'pickup',
        x: 360,
        y: 360,
        radius: 40,
        text: "Pick up package at Lu's Garage",
        timer: 120
      },
      {
        type: 'deliver',
        x: 2160,
        y: 1080,
        radius: 50,
        text: "Deliver package to drop-off point",
        timer: 90
      }
    ],
    reward: 250
  },
  {
    id: 2,
    title: "Mission 2: Dockside Debt",
    giver: "Lucia Prado",
    introLines: [
      { speaker: "Lu Prado", text: "Those Marrow brothers are hiding a case at the docks. Go get it, but watch out for their guards!" }
    ],
    steps: [
      {
        type: 'goto',
        x: 2880,
        y: 2160,
        radius: 50,
        text: "Drive to the Docks"
      },
      {
        type: 'pickup',
        x: 3000,
        y: 2280,
        radius: 45,
        text: "Retrieve case from warehouse on foot",
        spawnGuards: true
      },
      {
        type: 'escape',
        x: 540,
        y: 540,
        radius: 60,
        text: "Escape to Safehouse & shake heat (or survive 45s)",
        timer: 45
      }
    ],
    reward: 600
  },
  {
    id: 3,
    title: "Mission 3: Cielo Goodbye",
    giver: "Lucia Prado",
    introLines: [
      { speaker: "Lu Prado", text: "It's all blowing up, Dario! Pick me up at the neon strip and hit the north-east bridge out of town!" }
    ],
    steps: [
      {
        type: 'pickupPassenger',
        x: 1800,
        y: 1080,
        radius: 55,
        text: "Pick up Lu Prado at the Neon Strip",
        timer: 90
      },
      {
        type: 'deliver',
        x: 3240,
        y: 360,
        radius: 65,
        text: "Escape across the North-East Bridge exit",
        timer: 100,
        pinWanted: 3
      }
    ],
    reward: 1200
  }
];

export function createMissionState() {
  return {
    activeMissionIndex: -1,
    currentStepIndex: 0,
    timer: 0,
    failed: false,
    completed: false,
    dialogue: null
  };
}

export function startMission(world, missionIndex) {
  if (missionIndex < 0 || missionIndex >= MISSIONS.length) return;
  const mission = MISSIONS[missionIndex];
  world.missionState.activeMissionIndex = missionIndex;
  world.missionState.currentStepIndex = 0;
  world.missionState.failed = false;
  world.missionState.completed = false;
  
  const firstStep = mission.steps[0];
  world.missionState.timer = firstStep.timer || 0;

  if (mission.introLines && mission.introLines.length > 0) {
    world.missionState.dialogue = {
      speaker: mission.introLines[0].speaker,
      text: mission.introLines[0].text,
      until: world.time + 6
    };
  }

  // If step requires guards
  if (firstStep.spawnGuards) {
    spawnMissionGuards(world, firstStep.x, firstStep.y);
  }
}

function spawnMissionGuards(world, cx, cy) {
  if (!world.guards) world.guards = [];
  for (let i = 0; i < 3; i++) {
    world.guards.push({
      x: cx + (Math.random() - 0.5) * 80,
      y: cy + (Math.random() - 0.5) * 80,
      health: 100,
      state: 'idle'
    });
  }
}

export function updateMissions(world, dt) {
  const mState = world.missionState;
  if (!mState) return;

  // Dialogue timer expiration
  if (mState.dialogue && world.time >= mState.dialogue.until) {
    mState.dialogue = null;
  }

  if (mState.activeMissionIndex < 0 || mState.completed || mState.failed) {
    // Check if player is near Lu's garage (360, 360) in free roam to start next mission
    const player = world.player;
    const garageDist = Math.hypot(player.x - 360, player.y - 360);
    if (garageDist < 45 && mState.activeMissionIndex < 0 && !mState.completed) {
      // Determine next mission to start (0, then 1, then 2)
      const nextIdx = world.stats && world.stats.missionsCompleted ? world.stats.missionsCompleted : 0;
      if (nextIdx < MISSIONS.length) {
        startMission(world, nextIdx);
      }
    }
    return;
  }

  const mission = MISSIONS[mState.activeMissionIndex];
  const step = mission.steps[mState.currentStepIndex];
  const player = world.player;

  // Handle step timer if present
  if (step.timer && step.timer > 0) {
    mState.timer -= dt;
    if (mState.timer <= 0) {
      mState.failed = true;
      mState.dialogue = { speaker: "Lu Prado", text: "We ran out of time! Mission failed. Return to the garage to retry.", until: world.time + 5 };
      return;
    }
  }

  // Pin wanted level if specified in step
  if (step.pinWanted) {
    world.wanted = Math.max(world.wanted, step.pinWanted);
  }

  // Check step completion
  const dist = Math.hypot(player.x - step.x, player.y - step.y);
  let stepDone = false;

  if (step.type === 'pickup' || step.type === 'deliver' || step.type === 'goto' || step.type === 'pickupPassenger') {
    if (dist <= step.radius) {
      stepDone = true;
    }
  } else if (step.type === 'escape') {
    // Escape requires either reaching x,y with wanted == 0 OR timer surviving
    const shakeWanted = world.wanted === 0 && dist <= step.radius;
    const survivedTimer = mState.timer <= 0;
    if (shakeWanted || survivedTimer) {
      stepDone = true;
    }
  }

  if (stepDone) {
    mState.currentStepIndex++;
    if (mState.currentStepIndex >= mission.steps.length) {
      // Mission Complete!
      mState.completed = true;
      world.money += mission.reward;
      if (!world.stats) world.stats = {};
      world.stats.missionsCompleted = (world.stats.missionsCompleted || 0) + 1;
      mState.dialogue = { speaker: "Lu Prado", text: `Great job! Mission completed. Reward: $${mission.reward}`, until: world.time + 6 };
      world.missionState.activeMissionIndex = -1; // back to free roam
    } else {
      // Move to next step
      const nextStep = mission.steps[mState.currentStepIndex];
      mState.timer = nextStep.timer || 0;
      if (nextStep.spawnGuards) {
        spawnMissionGuards(world, nextStep.x, nextStep.y);
      }
      mState.dialogue = { speaker: "Lu Prado", text: `Good. Now: ${nextStep.text}`, until: world.time + 5 };
    }
  }
}
