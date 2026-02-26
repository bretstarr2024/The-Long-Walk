// ============================================================
// The Long Walk — Game Engine (All Systems)
// ============================================================

import { GameState, WalkerState, NarrativeEntry, Act, HorrorTier } from './types';
import { addNarrative, getAliveWalkers, getWalkerData, getWalkersRemaining, updateCurrentTime } from './state';
import { getRouteSegment, getCrowdPhase, AMBIENT_DESCRIPTIONS } from './data/route';

// ============================================================
// MASTER TICK — called every frame
// ============================================================

export function gameTick(state: GameState, realDeltaMs: number) {
  if (state.isPaused || state.screen !== 'game' || !state.player.alive) return;

  state.playtimeMs += realDeltaMs;

  // 1 real second = 1 game minute at 1x speed
  const gameMinutes = (realDeltaMs / 1000) * state.gameSpeed;

  // Update world time
  updateWorldTime(state, gameMinutes);

  // Update player stats
  updatePlayerSpeed(state);
  updatePlayerStamina(state, gameMinutes);
  updateHydrationHunger(state, gameMinutes);
  updatePain(state, gameMinutes);
  updateMorale(state, gameMinutes);
  updateClarity(state, gameMinutes);
  updateCooldowns(state, gameMinutes);

  // Check player warnings
  checkPlayerWarnings(state, gameMinutes);

  // Update all NPCs
  updateAllNPCs(state, gameMinutes);

  // Check NPC eliminations
  checkNPCEliminations(state);

  // Update environment
  updateEnvironment(state);

  // Update act and horror tier
  updateActAndHorror(state);

  // Ambient narrative (occasional)
  maybeAddAmbientNarrative(state);
}

// ============================================================
// WORLD TIME
// ============================================================

function updateWorldTime(state: GameState, gameMinutes: number) {
  const prevMile = Math.floor(state.world.milesWalked);
  state.world.hoursElapsed += gameMinutes / 60;
  state.world.milesWalked += (state.player.speed / 60) * gameMinutes;
  updateCurrentTime(state);

  const newMile = Math.floor(state.world.milesWalked);
  if (newMile > prevMile && newMile % 50 === 0) {
    addNarrative(state, `Mile ${newMile}. ${getWalkersRemaining(state)} walkers remaining.`, 'system');
    // Milestone morale boost
    state.player.morale = Math.min(100, state.player.morale + 5);
  }
}

// ============================================================
// PLAYER SPEED
// ============================================================

function updatePlayerSpeed(state: GameState) {
  const p = state.player;
  // Actual speed limited by stamina and pain
  let maxSpeed = 7;
  if (p.pain > 90) maxSpeed = 4.5;
  else if (p.pain > 70) maxSpeed = 5;
  else if (p.pain > 50) maxSpeed = 6;

  if (p.stamina < 10) maxSpeed = Math.min(maxSpeed, 3.5);
  else if (p.stamina < 25) maxSpeed = Math.min(maxSpeed, 4.2);
  else if (p.stamina < 40) maxSpeed = Math.min(maxSpeed, 5);

  p.speed = Math.min(p.targetSpeed, maxSpeed);
  p.speed = Math.max(0, p.speed);
}

// ============================================================
// STAMINA
// ============================================================

function updatePlayerStamina(state: GameState, gameMinutes: number) {
  const p = state.player;
  const hours = state.world.hoursElapsed;

  // Base degradation per minute (increases over time)
  let baseRate: number;
  if (hours < 12) baseRate = 0.5;
  else if (hours < 24) baseRate = 0.8;
  else if (hours < 48) baseRate = 1.2;
  else if (hours < 72) baseRate = 1.8;
  else baseRate = 2.5;

  // Modifiers
  let modifier = 1;
  const seg = getRouteSegment(state.world.milesWalked);
  if (seg.terrain === 'uphill') modifier *= 1.5;
  else if (seg.terrain === 'downhill') modifier *= 0.8;

  if (state.world.weather === 'rain') modifier *= 1.25;
  else if (state.world.weather === 'heavy_rain') modifier *= 1.25;
  else if (state.world.weather === 'cold') modifier *= 1.15;
  else if (state.world.weather === 'fog') modifier *= 1.05;

  if (p.hydration < 30) modifier *= 1.4;
  if (p.hunger < 30) modifier *= 1.2;
  if (p.pain > 70) modifier *= 1.3;
  if (p.morale < 20) modifier *= 1.25;
  if (p.speed > 5) modifier *= 1.5;

  // Alliance benefit
  if (p.alliances.length > 0) {
    const allyNearby = state.walkers.some(w =>
      w.alive && p.alliances.includes(w.walkerNumber) && w.position === p.position
    );
    if (allyNearby) modifier *= 0.9;
  }

  const drain = baseRate * modifier * gameMinutes / 60; // convert to per-minute drain
  p.stamina = Math.max(0, p.stamina - drain);

  // Collapse check
  if (p.stamina <= 0) {
    addNarrative(state, 'Your legs give out. You stumble, barely catching yourself.', 'warning');
    p.speed = Math.min(p.speed, 3.5);
  }
}

// ============================================================
// HYDRATION & HUNGER
// ============================================================

function updateHydrationHunger(state: GameState, gameMinutes: number) {
  const p = state.player;
  // Both degrade at -1 per 10 game minutes
  p.hydration = Math.max(0, p.hydration - (gameMinutes / 10));
  p.hunger = Math.max(0, p.hunger - (gameMinutes / 10));
}

function updateCooldowns(state: GameState, gameMinutes: number) {
  const p = state.player;
  p.foodCooldown = Math.max(0, p.foodCooldown - gameMinutes);
  p.waterCooldown = Math.max(0, p.waterCooldown - gameMinutes);
}

export function requestFood(state: GameState): boolean {
  const p = state.player;
  if (p.foodCooldown > 0) return false;

  // Vomit risk at high pain
  if (p.pain > 70 && Math.random() < 0.3) {
    addNarrative(state, 'You eat too fast. Your stomach rebels. You vomit on the road, losing more than you gained.', 'system');
    p.stamina = Math.max(0, p.stamina - 10);
    p.hydration = Math.max(0, p.hydration - 15);
    p.foodCooldown = 30;
    return true;
  }

  p.stamina = Math.min(100, p.stamina + 5);
  p.hunger = Math.min(100, p.hunger + 20);
  p.foodCooldown = 30; // 30 game minutes
  addNarrative(state, 'You grab a food concentrate from the belt. You eat while walking, not tasting it.', 'system');
  return true;
}

export function requestWater(state: GameState): boolean {
  const p = state.player;
  if (p.waterCooldown > 0) return false;

  p.stamina = Math.min(100, p.stamina + 3);
  p.hydration = Math.min(100, p.hydration + 25);
  p.waterCooldown = 15; // 15 game minutes
  addNarrative(state, 'You take a canteen from the belt. The water is lukewarm but it\'s everything.', 'system');
  return true;
}

// ============================================================
// PAIN
// ============================================================

function updatePain(state: GameState, gameMinutes: number) {
  const p = state.player;
  const miles = state.world.milesWalked;

  // Blisters after mile 20: +1 pain per mile (prorated per minute)
  if (miles > 20) {
    const milesThisTick = (p.speed / 60) * gameMinutes;
    p.pain = Math.min(100, p.pain + milesThisTick * 1.0);
  }

  // Downhill knee pain
  const seg = getRouteSegment(miles);
  if (seg.terrain === 'downhill') {
    p.pain = Math.min(100, p.pain + gameMinutes * 0.05);
  }

  // Random cramps (5% per mile after mile 30)
  if (miles > 30) {
    const milesThisTick = (p.speed / 60) * gameMinutes;
    if (Math.random() < 0.05 * milesThisTick) {
      p.pain = Math.min(100, p.pain + 15);
      p.speed = Math.min(p.speed, 3.8); // brief speed drop
      addNarrative(state, 'A cramp seizes your calf muscle. You grit your teeth and push through it.', 'narration');
    }
  }

  // Charley horse (1% per mile after mile 50)
  if (miles > 50) {
    const milesThisTick = (p.speed / 60) * gameMinutes;
    if (Math.random() < 0.01 * milesThisTick) {
      p.pain = Math.min(100, p.pain + 25);
      p.speed = Math.min(p.speed, 3.5);
      addNarrative(state, 'CHARLEY HORSE. Your leg locks up completely. You nearly go down. Keep walking. KEEP WALKING.', 'warning');
    }
  }
}

// ============================================================
// MORALE
// ============================================================

function updateMorale(state: GameState, gameMinutes: number) {
  const p = state.player;

  // Night drain: -1 per 30 minutes
  if (state.world.isNight) {
    p.morale = Math.max(0, p.morale - (gameMinutes / 30));
  }

  // Alliance proximity boost: +1 per 10 minutes
  if (p.alliances.length > 0) {
    const allyNear = state.walkers.some(w =>
      w.alive && p.alliances.includes(w.walkerNumber) && w.position === p.position
    );
    if (allyNear) {
      p.morale = Math.min(100, p.morale + (gameMinutes / 10));
    }
  }

  // Pain spike drain
  if (p.pain > 70) {
    p.morale = Math.max(0, p.morale - gameMinutes * 0.02);
  }

  // Willpower failure check
  if (p.morale <= 0 && p.alive) {
    p.alive = false;
    addNarrative(state,
      'You stop walking. Not because your body failed. Because you chose to. The road stretches on without you.',
      'elimination'
    );
    state.screen = 'gameover';
  }
}

// ============================================================
// CLARITY (Sleep Deprivation)
// ============================================================

function updateClarity(state: GameState, gameMinutes: number) {
  const p = state.player;
  const hours = state.world.hoursElapsed;

  // No clarity loss before hour 16
  if (hours < 16) return;

  let rate: number; // clarity loss per hour
  if (hours < 24) rate = 1;
  else if (hours < 36) rate = 2;
  else if (hours < 48) rate = 3;
  else rate = 4;

  p.clarity = Math.max(0, p.clarity - (rate * gameMinutes / 60));
}

// ============================================================
// WARNING SYSTEM
// ============================================================

function checkPlayerWarnings(state: GameState, gameMinutes: number) {
  const p = state.player;
  if (!p.alive) return;

  if (p.speed < 4.0) {
    // Accumulate slow time — warning after 10 seconds (~0.167 minutes)
    p.warningTimer += gameMinutes;
    if (p.warningTimer >= 0.167 && p.warnings < 3) {
      // Slow for too long under this simple model: issue warning immediately when speed < 4
      // (Brief says 10 continuous seconds, but we track with warningTimer)
      // Actually let's track slow seconds separately
    }
  }

  // Simplified: if speed < 4.0 for this tick, risk a warning
  // We check each tick. If under 4.0, increment a hidden "slow counter"
  // For simplicity: issue warning if speed < 4.0 and been slow for > 0.167 minutes total since last check
  if (p.speed < 4.0) {
    if (!p.flags._slowAccum) {
      p.flags._slowStart = true;
      (p as any)._slowAccum = 0;
    }
    (p as any)._slowAccum = ((p as any)._slowAccum || 0) + gameMinutes;

    if ((p as any)._slowAccum >= 0.167) { // ~10 seconds
      issueWarning(state);
      (p as any)._slowAccum = 0;
    }
  } else {
    (p as any)._slowAccum = 0;

    // Walk-off timer: 60 game minutes without new warning removes one
    if (p.warnings > 0) {
      p.warningTimer += gameMinutes;
      if (p.warningTimer >= 60) {
        p.warnings--;
        p.warningTimer = 0;
        addNarrative(state, `Warning walked off. Warnings: ${p.warnings}/3.`, 'system');
      }
    }
  }
}

function issueWarning(state: GameState) {
  const p = state.player;
  console.log(`[Engine] WARNING issued! ${p.warnings + 1}/3 at speed ${p.speed.toFixed(1)} mph, mile ${state.world.milesWalked.toFixed(1)}`);
  p.warnings++;
  p.warningTimer = 0;
  p.morale = Math.max(0, p.morale - 10);

  const ordinal = p.warnings === 1 ? 'First' : p.warnings === 2 ? 'Second' : 'Third';
  addNarrative(state,
    `"Warning. Walker #100. ${ordinal} warning." The soldier's voice is flat. Mechanical.`,
    'warning'
  );

  if (p.warnings >= 3) {
    p.alive = false;
    addNarrative(state,
      `Walker #100 — ${p.name} — Eliminated — Mile ${state.world.milesWalked.toFixed(1)}`,
      'elimination'
    );
    state.screen = 'gameover';
  }
}

// ============================================================
// NPC SYSTEMS
// ============================================================

function updateAllNPCs(state: GameState, gameMinutes: number) {
  for (const w of state.walkers) {
    if (!w.alive) continue;
    updateNPCStats(state, w, gameMinutes);
    updateNPCBehavior(state, w);
  }
}

function updateNPCStats(state: GameState, w: WalkerState, gameMinutes: number) {
  const hours = state.world.hoursElapsed;
  const data = getWalkerData(state, w.walkerNumber);
  if (!data) return;

  // Stamina drain (simplified for NPCs)
  let baseRate = hours < 12 ? 0.4 : hours < 24 ? 0.7 : hours < 48 ? 1.1 : 1.6;

  // Weaker walkers drain faster
  if (data.physicalState === 'weak') baseRate *= 1.3;
  if (data.physicalState === 'strong') baseRate *= 0.7;

  // Weather affects NPCs too
  if (state.world.weather === 'rain' || state.world.weather === 'heavy_rain') baseRate *= 1.2;
  if (state.world.terrain === 'uphill') baseRate *= 1.4;

  w.stamina = Math.max(0, w.stamina - (baseRate * gameMinutes / 60));
  w.pain = Math.min(100, w.pain + (gameMinutes * 0.01)); // slow pain increase
  w.morale = Math.max(0, w.morale - gameMinutes * 0.005);

  // Clarity loss after hour 16
  if (hours > 16) {
    const rate = hours < 24 ? 0.8 : hours < 36 ? 1.5 : 2.5;
    w.clarity = Math.max(0, w.clarity - (rate * gameMinutes / 60));
  }

  // NPC speed adjusts based on stamina
  if (w.stamina < 15) w.speed = 3.5 + Math.random() * 0.5;
  else if (w.stamina < 30) w.speed = 3.8 + Math.random() * 0.5;
  else w.speed = 4.2 + Math.random() * 0.6;
}

function updateNPCBehavior(state: GameState, w: WalkerState) {
  const data = getWalkerData(state, w.walkerNumber);
  if (!data) return;

  const approachingElim = state.world.milesWalked > (data.eliminationMile - 15);

  if (approachingElim) {
    if (w.stamina < 20 || state.world.milesWalked > (data.eliminationMile - 5)) {
      w.behavioralState = 'breaking_down';
      w.speed = 3.2 + Math.random() * 0.8;
    } else {
      w.behavioralState = 'struggling';
      w.speed = 3.8 + Math.random() * 0.4;
    }
  } else if (w.stamina < 30) {
    w.behavioralState = 'struggling';
  } else {
    w.behavioralState = 'steady';
  }
}

// ============================================================
// NPC ELIMINATION
// ============================================================

function checkNPCEliminations(state: GameState) {
  const mile = state.world.milesWalked;

  for (const w of state.walkers) {
    if (!w.alive) continue;
    const data = getWalkerData(state, w.walkerNumber);
    if (!data) continue;

    // Eliminate if past their mile (with small random variance)
    const variance = (data.tier === 1) ? 3 : (data.tier === 2) ? 5 : 8;
    const elimMile = data.eliminationMile + (Math.sin(w.walkerNumber * 7.3) * variance);

    if (mile >= elimMile) {
      eliminateWalker(state, w, data);
    }
  }
}

function eliminateWalker(state: GameState, w: WalkerState, data: import('./types').WalkerData) {
  console.log(`[Engine] Eliminating Walker #${w.walkerNumber} ${data.name} (Tier ${data.tier}) at mile ${state.world.milesWalked.toFixed(1)}`);
  w.alive = false;
  w.behavioralState = 'eliminated';
  w.eliminatedAtMile = state.world.milesWalked;
  state.eliminationCount++;

  // Narrative
  const elimText = data.tier <= 2
    ? data.eliminationNarrative
    : `Walker #${w.walkerNumber} — ${data.name} — eliminated.`;

  addNarrative(state,
    `WALKER #${w.walkerNumber} — ${data.name.toUpperCase()} — ELIMINATED — MILE ${state.world.milesWalked.toFixed(1)}`,
    'elimination'
  );

  if (data.tier <= 2) {
    addNarrative(state, elimText, 'narration');
  }

  // Morale impact on player
  const relHit = w.isAlliedWithPlayer ? -30 : (w.relationship > 40 ? -15 : w.relationship > 10 ? -8 : -3);
  state.player.morale = Math.max(0, state.player.morale + relHit);

  // Remove from alliances
  if (w.isAlliedWithPlayer) {
    state.player.alliances = state.player.alliances.filter(n => n !== w.walkerNumber);
    addNarrative(state, `${data.name} is gone.`, 'narration');
  }

  // Other nearby walkers react
  const alive = getAliveWalkers(state);
  if (alive.length > 5 && data.tier <= 2 && Math.random() < 0.5) {
    const reactor = alive[Math.floor(Math.random() * alive.length)];
    const rData = getWalkerData(state, reactor.walkerNumber);
    if (rData) {
      const reactions = [
        `${rData.name} looks away.`,
        `${rData.name} keeps walking. Eyes forward.`,
        `${rData.name} mutters something under their breath.`,
        `Someone behind you whispers, "Jesus."`,
        'A moment of silence ripples through the walkers. Then the sound of footsteps fills it.',
      ];
      addNarrative(state, reactions[Math.floor(Math.random() * reactions.length)], 'narration');
    }
  }
}

// ============================================================
// ENVIRONMENT
// ============================================================

function updateEnvironment(state: GameState) {
  const mile = state.world.milesWalked;

  // Terrain
  const seg = getRouteSegment(mile);
  if (state.world.terrain !== seg.terrain) {
    state.world.terrain = seg.terrain;
  }

  // Crowd
  const crowd = getCrowdPhase(mile);
  state.world.crowdMood = crowd.mood;
  state.world.crowdDensity = seg.crowdDensity;

  // Weather changes every 2-6 game hours
  if (!state.triggeredEvents.has('weather_' + Math.floor(state.world.hoursElapsed / 3))) {
    state.triggeredEvents.add('weather_' + Math.floor(state.world.hoursElapsed / 3));
    const weathers: Array<import('./types').Weather> = ['clear', 'clear', 'cloudy', 'cloudy', 'rain', 'cold', 'fog'];

    // Scramm's rain at mile 100-120
    if (mile >= 100 && mile <= 120) {
      state.world.weather = 'heavy_rain';
    } else {
      state.world.weather = weathers[Math.floor(Math.random() * weathers.length)];
    }
  }
}

// ============================================================
// ACT & HORROR TIER
// ============================================================

function updateActAndHorror(state: GameState) {
  const mile = state.world.milesWalked;
  const alive = getWalkersRemaining(state);

  // Acts
  if (mile < 30 && alive > 85) state.world.currentAct = 1;
  else if (mile < 120 && alive > 50) state.world.currentAct = 2;
  else if (mile < 250 && alive > 20) state.world.currentAct = 3;
  else state.world.currentAct = 4;

  // Horror tiers
  if (mile < 100) state.world.horrorTier = 1;
  else if (mile < 200) state.world.horrorTier = 2;
  else if (mile < 300) state.world.horrorTier = 3;
  else state.world.horrorTier = 4;
}

// ============================================================
// AMBIENT NARRATIVE
// ============================================================

let lastAmbientMile = -5;

function maybeAddAmbientNarrative(state: GameState) {
  const mile = state.world.milesWalked;
  if (mile - lastAmbientMile < 3) return; // Only every ~3 miles

  lastAmbientMile = mile;

  // Pick a random ambient description
  const descriptions: string[] = [];

  // Terrain
  const terrain = state.world.terrain;
  const terrainDescs = AMBIENT_DESCRIPTIONS.terrain[terrain];
  if (terrainDescs) descriptions.push(terrainDescs[Math.floor(Math.random() * terrainDescs.length)]);

  // Weather (occasionally)
  if (Math.random() < 0.4) {
    const weatherDescs = AMBIENT_DESCRIPTIONS.weather[state.world.weather];
    if (weatherDescs) descriptions.push(weatherDescs[Math.floor(Math.random() * weatherDescs.length)]);
  }

  if (descriptions.length > 0) {
    addNarrative(state, descriptions[Math.floor(Math.random() * descriptions.length)], 'narration');
  }
}

// ============================================================
// PLAYER ACTIONS
// ============================================================

export function setPlayerSpeed(state: GameState, speed: number) {
  state.player.targetSpeed = Math.max(0, Math.min(7, speed));
}

export function setPlayerPosition(state: GameState, pos: import('./types').PackPosition) {
  state.player.position = pos;
}

export function formAlliance(state: GameState, walkerNum: number): boolean {
  const w = state.walkers.find(w => w.walkerNumber === walkerNum);
  if (!w || !w.alive || w.isAlliedWithPlayer) return false;
  if (state.player.alliances.length >= 2) return false;
  if (w.relationship < 60) return false;

  w.isAlliedWithPlayer = true;
  state.player.alliances.push(walkerNum);
  const data = getWalkerData(state, walkerNum);
  addNarrative(state, `You and ${data?.name || 'Walker #' + walkerNum} are walking together now. An alliance.`, 'narration');
  return true;
}
