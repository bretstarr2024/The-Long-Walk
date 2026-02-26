// ============================================================
// The Long Walk — Game Engine (All Systems)
// ============================================================

import { GameState, WalkerState, NarrativeEntry, Act, HorrorTier } from './types';
import { addNarrative, getAliveWalkers, getWalkerData, getWalkersRemaining, updateCurrentTime } from './state';
import { getRouteSegment, getCrowdPhase, AMBIENT_DESCRIPTIONS } from './data/route';
import {
  checkForCrisis, updateActiveCrisis, updateBladder, updateTempEffects,
  getActiveSpeedOverride, getActiveStaminaDrainMult,
} from './crises';

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

  // Crisis system: bladder, temp effects, active crisis timer, new crisis check
  updateBladder(state, gameMinutes);
  updateTempEffects(state, gameMinutes);
  if (state.player.activeCrisis) {
    updateActiveCrisis(state, gameMinutes);
  } else {
    checkForCrisis(state, gameMinutes);
  }

  // Check player warnings
  checkPlayerWarnings(state, gameMinutes);

  // Update all NPCs
  updateAllNPCs(state, gameMinutes);

  // NPC warning system (issues warnings when speed < 4.0, eliminates at 3)
  checkNPCWarnings(state, gameMinutes);

  // Backstop: force elimination if way past their mile
  checkNPCEliminations(state);

  // Update position transition animation
  updatePositionTransition(gameMinutes);

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

  // Crisis speed override takes priority
  const crisisSpeed = p.activeCrisis?.speedOverride;
  if (crisisSpeed != null) {
    p.speed = crisisSpeed;
    return;
  }

  // Temp effect speed override (post-crisis)
  const tempSpeed = getActiveSpeedOverride(state);
  if (tempSpeed != null) {
    p.speed = Math.min(p.targetSpeed, tempSpeed);
    p.speed = Math.max(0, p.speed);
    return;
  }

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

  // Passive recovery at low speed: walking at exactly 4.0-4.2 mph conserves energy
  if (p.speed >= 4.0 && p.speed <= 4.2) modifier *= 0.6;
  else if (p.speed >= 4.0 && p.speed <= 4.5) modifier *= 0.8;

  // Crisis temp effect: stamina drain multiplier
  const drainMult = getActiveStaminaDrainMult(state);
  const drain = baseRate * modifier * drainMult * gameMinutes / 60;

  // Slight passive recovery when well-fed and hydrated at low speed
  let recovery = 0;
  if (p.speed >= 4.0 && p.speed <= 4.2 && p.hunger > 60 && p.hydration > 60) {
    recovery = 0.05 * gameMinutes / 60; // very slow recovery when conserving
  }

  p.stamina = Math.max(0, Math.min(100, p.stamina - drain + recovery));

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

  // Cramps and charley horses are now handled by the crisis system (cramp_lockup crisis)
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

  // Willpower failure: morale at 0 forces speed to drop, triggering warnings naturally
  if (p.morale <= 0 && p.alive) {
    p.morale = 0;
    // Willpower failure slows you down — the warning system handles the rest
    if (p.speed > 3.5) {
      addNarrative(state,
        'Something inside you breaks. Your legs slow. You don\'t care anymore. The road doesn\'t care either.',
        'thought'
      );
    }
    p.targetSpeed = Math.min(p.targetSpeed, 3.5);
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

const PLAYER_WARNING_COOLDOWN = 5; // game-minutes minimum between warnings
const PLAYER_SLOW_THRESHOLD = 0.167; // ~10 seconds below 4.0 mph triggers warning

function checkPlayerWarnings(state: GameState, gameMinutes: number) {
  const p = state.player;
  if (!p.alive) return;

  if (p.speed < 4.0) {
    // Reset walk-off timer while slow
    p.warningTimer = 0;

    // Accumulate slow time
    p.slowAccum += gameMinutes;

    // Check cooldown since last warning
    const minutesSinceLastWarn = (state.world.hoursElapsed - p.lastWarningTime) * 60;
    const cooldownMet = minutesSinceLastWarn >= PLAYER_WARNING_COOLDOWN;

    // Issue warning after threshold AND cooldown
    if (p.slowAccum >= PLAYER_SLOW_THRESHOLD && p.warnings < 3 && cooldownMet) {
      issueWarning(state);
      p.slowAccum = 0;
    }
  } else {
    // Above 4.0 — reset slow accumulator
    p.slowAccum = 0;

    // Walk-off timer: 60 game minutes above 4.0 clears one warning
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
  p.lastWarningTime = state.world.hoursElapsed;
  p.morale = Math.max(0, p.morale - 10);
  state.lastWarningMile = state.world.milesWalked;

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

  const mile = state.world.milesWalked;
  const variance = (data.tier === 1) ? 3 : (data.tier === 2) ? 5 : 8;
  const elimMile = data.eliminationMile + (Math.sin(w.walkerNumber * 7.3) * variance);
  const distToElim = elimMile - mile;

  if (distToElim <= 0) {
    // Past elimination mile: speed locked well below 4.0, doomed
    w.behavioralState = 'breaking_down';
    w.speed = 2.5 + Math.random() * 0.5;
  } else if (distToElim < 5) {
    // Close to elimination: breaking down, mostly below 4.0
    w.behavioralState = 'breaking_down';
    w.speed = 3.0 + Math.random() * 0.9; // 3.0–3.9, occasionally touches 3.9
  } else if (distToElim < 15) {
    // Approaching: struggling, sometimes dipping below 4.0
    w.behavioralState = 'struggling';
    w.speed = 3.6 + Math.random() * 0.7; // 3.6–4.3, straddling the line
  } else if (w.stamina < 30) {
    w.behavioralState = 'struggling';
  } else {
    w.behavioralState = 'steady';
  }

  // Decline narratives: Tier 1 walkers show visible deterioration 5-15 miles before elimination
  if (data.tier === 1 && data.declineNarratives && distToElim > 0 && distToElim < 15) {
    if (w.position === state.player.position && mile - w.lastDeclineNarrativeMile >= 3) {
      // Pick a narrative based on how close to elimination
      const idx = Math.min(
        data.declineNarratives.length - 1,
        Math.floor((15 - distToElim) / (15 / data.declineNarratives.length))
      );
      addNarrative(state, data.declineNarratives[idx], 'narration');
      w.lastDeclineNarrativeMile = mile;
    }
  }
}

// ============================================================
// NPC WARNING SYSTEM
// Walkers below 4.0 mph accumulate warnings just like the player.
// Three warnings = elimination (gunshot).
// ============================================================

// Track slow-time accumulation per NPC (game-minutes below 4.0 mph)
const npcSlowAccum = new Map<number, number>();
// Track last warning time per NPC (game hours) — enforces cooldown between warnings
const npcLastWarningHour = new Map<number, number>();
// Track post-warning speed boost per NPC (remaining game-minutes of adrenaline)
const npcWarningBoost = new Map<number, number>();

const WARNING_ACCUM_THRESHOLD = 8;  // game-minutes below 4.0 to trigger warning
const WARNING_COOLDOWN = 20;         // game-minutes minimum between warnings
const WARNING_BOOST_DURATION = 8;    // game-minutes of fight-to-survive speed boost

function checkNPCWarnings(state: GameState, gameMinutes: number) {
  for (const w of state.walkers) {
    if (!w.alive) continue;

    // --- Post-warning boost: walker fights to keep pace ---
    const boost = npcWarningBoost.get(w.walkerNumber) || 0;
    if (boost > 0) {
      npcWarningBoost.set(w.walkerNumber, boost - gameMinutes);
      // Override speed: adrenaline pushes them above 4.0 temporarily
      w.speed = Math.max(w.speed, 4.1 + Math.random() * 0.3);
      npcSlowAccum.set(w.walkerNumber, 0); // reset slow time during boost
      continue; // skip warning check while boosted
    }

    if (w.speed < 4.0) {
      // Reset walk-off progress — they're back under 4.0
      w.warningTimer = 0;

      // Accumulate slow time
      const accum = (npcSlowAccum.get(w.walkerNumber) || 0) + gameMinutes;
      npcSlowAccum.set(w.walkerNumber, accum);

      // Check cooldown since last warning
      const lastWarnHour = npcLastWarningHour.get(w.walkerNumber) || -999;
      const minutesSinceLastWarn = (state.world.hoursElapsed - lastWarnHour) * 60;
      const cooldownMet = minutesSinceLastWarn >= WARNING_COOLDOWN;

      // Issue warning after threshold AND cooldown met
      if (accum >= WARNING_ACCUM_THRESHOLD && w.warnings < 3 && cooldownMet) {
        issueNPCWarning(state, w);
        npcSlowAccum.set(w.walkerNumber, 0);
        npcLastWarningHour.set(w.walkerNumber, state.world.hoursElapsed);

        // Give them a fighting chance (adrenaline boost)
        if (w.warnings < 3) {
          npcWarningBoost.set(w.walkerNumber, WARNING_BOOST_DURATION);
        }
      }

      // Three warnings: eliminated
      if (w.warnings >= 3) {
        const data = getWalkerData(state, w.walkerNumber);
        if (data) eliminateWalker(state, w, data);
      }
    } else {
      // Above 4.0 — reset slow accumulator
      npcSlowAccum.set(w.walkerNumber, 0);

      // Walk-off timer: 60 game-minutes above 4.0 clears one warning
      if (w.warnings > 0) {
        w.warningTimer += gameMinutes;
        if (w.warningTimer >= 60) {
          w.warnings--;
          w.warningTimer = 0;
          const data = getWalkerData(state, w.walkerNumber);
          if (data && w.position === state.player.position) {
            addNarrative(state, `${data.name} picks up the pace. Warning walked off.`, 'system');
          }
        }
      }
    }
  }
}

function issueNPCWarning(state: GameState, w: WalkerState) {
  w.warnings++;
  const data = getWalkerData(state, w.walkerNumber);
  if (!data) return;

  const ordinal = w.warnings === 1 ? 'First' : w.warnings === 2 ? 'Second' : 'Third';

  if (w.position === state.player.position) {
    // Nearby: full announcement, you hear the soldier
    addNarrative(state,
      `"Warning. Walker #${w.walkerNumber}. ${ordinal} warning." ${data.name}.`,
      'warning'
    );
  } else if (data.tier <= 2) {
    // Named walkers: you catch it from a distance
    addNarrative(state,
      `From the ${w.position} of the pack: "Warning. Walker #${w.walkerNumber}. ${ordinal} warning." ${data.name}.`,
      'warning'
    );
  }
  // Tier 3 at different position: silent (too many to narrate)
}

// ============================================================
// NPC ELIMINATION (backstop — normally warnings handle this)
// ============================================================

function checkNPCEliminations(state: GameState) {
  const mile = state.world.milesWalked;

  for (const w of state.walkers) {
    if (!w.alive) continue;
    const data = getWalkerData(state, w.walkerNumber);
    if (!data) continue;

    const variance = (data.tier === 1) ? 3 : (data.tier === 2) ? 5 : 8;
    const elimMile = data.eliminationMile + (Math.sin(w.walkerNumber * 7.3) * variance);

    // Past their elimination mile: start degrading speed to trigger natural warnings
    if (mile >= elimMile && w.warnings < 3) {
      const milesOverdue = mile - elimMile;
      // Gradually slow them down — the further past, the worse
      const slowFactor = Math.min(0.8, milesOverdue * 0.15);
      w.speed = Math.max(2.0, w.speed - slowFactor);
      // Their decline makes them struggle visibly
      if (w.behavioralState !== 'breaking_down' && milesOverdue > 1) {
        w.behavioralState = 'struggling';
      }
      if (milesOverdue > 3) {
        w.behavioralState = 'breaking_down';
      }
    }

    // Hard backstop: if very overdue, force warnings — but spaced at least 5 game-minutes apart
    if (mile >= elimMile + 8 && w.warnings < 3) {
      const lastWarnHour = npcLastWarningHour.get(w.walkerNumber) || -999;
      const minutesSinceLast = (state.world.hoursElapsed - lastWarnHour) * 60;
      if (minutesSinceLast >= 5) {
        issueNPCWarning(state, w);
        npcLastWarningHour.set(w.walkerNumber, state.world.hoursElapsed);
        // Brief adrenaline even from backstop (they fight it)
        npcWarningBoost.set(w.walkerNumber, 3);
      }
      if (w.warnings >= 3) {
        eliminateWalker(state, w, data);
      }
    }
  }
}

function eliminateWalker(state: GameState, w: WalkerState, data: import('./types').WalkerData) {
  console.log(`[Engine] Eliminating Walker #${w.walkerNumber} ${data.name} (Tier ${data.tier}) at mile ${state.world.milesWalked.toFixed(1)}`);
  w.alive = false;
  w.behavioralState = 'eliminated';
  w.eliminatedAtMile = state.world.milesWalked;
  state.eliminationCount++;

  // Tier 1 elimination scene: cinematic overlay if player had relationship > 20
  if (data.tier === 1 && data.eliminationScene && w.relationship > 20 && !state.activeScene) {
    state.activeScene = {
      id: `elim_scene_${w.walkerNumber}`,
      panels: data.eliminationScene,
      currentPanel: 0,
    };
    state.isPaused = true;
  }

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

// Position transition state — for smooth animation
let positionTransition: { from: string; to: string; progress: number } | null = null;

export function getPositionTransition() { return positionTransition; }

export function setPlayerPosition(state: GameState, pos: import('./types').PackPosition) {
  const prev = state.player.position;
  state.player.position = pos;

  // Temporarily boost speed — you jog to change position
  state.player.speed = Math.min(7, state.player.speed + 0.8);

  // Small stamina cost for hustling
  state.player.stamina = Math.max(0, state.player.stamina - 2);

  // Start smooth animation transition (0 → 1 over time)
  positionTransition = { from: prev, to: pos, progress: 0 };
}

// Called from gameTick to advance position animation
export function updatePositionTransition(gameMinutes: number) {
  if (!positionTransition) return;
  // Animate over ~2 game minutes (2 real seconds at 1x)
  positionTransition.progress += gameMinutes / 2;
  if (positionTransition.progress >= 1) {
    positionTransition = null;
  }
}

// ============================================================
// FOOD/WATER SHARING WITH ALLIES
// ============================================================

export function shareFood(state: GameState): boolean {
  const p = state.player;
  if (p.foodCooldown > 0) return false;

  // Find first nearby ally
  const allyNum = p.alliances.find(num => {
    const w = state.walkers.find(ws => ws.walkerNumber === num);
    return w && w.alive && w.position === p.position;
  });
  if (allyNum == null) return false;

  const ally = state.walkers.find(w => w.walkerNumber === allyNum);
  if (!ally) return false;

  // Burns player's food cooldown — ally gets the food, not you
  p.foodCooldown = 30;
  ally.stamina = Math.min(100, ally.stamina + 8);
  ally.morale = Math.min(100, ally.morale + 5);
  ally.relationship = Math.min(100, ally.relationship + 10);
  p.morale = Math.min(100, p.morale + 5);

  const data = getWalkerData(state, allyNum);
  const name = data?.name || `Walker #${allyNum}`;
  addNarrative(state, `You hand your food concentrate to ${name}. They eat it without a word. You won't eat for thirty minutes.`, 'narration');
  ally.playerActions.push(`Shared food at mile ${Math.round(state.world.milesWalked)}`);
  return true;
}

export function shareWater(state: GameState): boolean {
  const p = state.player;
  if (p.waterCooldown > 0) return false;

  const allyNum = p.alliances.find(num => {
    const w = state.walkers.find(ws => ws.walkerNumber === num);
    return w && w.alive && w.position === p.position;
  });
  if (allyNum == null) return false;

  const ally = state.walkers.find(w => w.walkerNumber === allyNum);
  if (!ally) return false;

  p.waterCooldown = 15;
  ally.stamina = Math.min(100, ally.stamina + 5);
  ally.morale = Math.min(100, ally.morale + 3);
  ally.relationship = Math.min(100, ally.relationship + 8);
  p.morale = Math.min(100, p.morale + 3);

  const data = getWalkerData(state, allyNum);
  const name = data?.name || `Walker #${allyNum}`;
  addNarrative(state, `You pass your canteen to ${name}. They drink deep. You'll go without for fifteen minutes.`, 'narration');
  ally.playerActions.push(`Shared water at mile ${Math.round(state.world.milesWalked)}`);
  return true;
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
