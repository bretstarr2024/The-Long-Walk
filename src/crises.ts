// ============================================================
// The Long Walk — Crisis Event System
// Random crises demand timed player decisions with tradeoffs
// ============================================================

import { GameState, ActiveCrisis, CrisisOption, CrisisType, CrisisEffects, TempEffect } from './types';
import { addNarrative, getWalkerData } from './state';

// ============================================================
// CONFIG
// ============================================================

// Minimum miles between crises by act
function minCrisisGap(act: number): number {
  switch (act) {
    case 1: return 15;
    case 2: return 8;
    case 3: return 4;
    case 4: return 2;
    default: return 8;
  }
}

// Track last mile we rolled for crisis check (once per mile)
let lastCrisisCheckMile = 0;

// ============================================================
// HELPER: Check if ally is nearby at player's position
// ============================================================

function getAllyNearby(state: GameState): number | null {
  for (const allyNum of state.player.alliances) {
    const w = state.walkers.find(ws => ws.walkerNumber === allyNum);
    if (w && w.alive && w.position === state.player.position) return allyNum;
  }
  return null;
}

function getAllyName(state: GameState, walkerNum: number): string {
  return getWalkerData(state, walkerNum)?.name || `Walker #${walkerNum}`;
}

// ============================================================
// CRISIS DEFINITIONS
// ============================================================

interface CrisisDefinition {
  type: CrisisType;
  canTrigger: (state: GameState) => boolean;
  chance: (state: GameState) => number; // 0-1 probability per mile
  build: (state: GameState) => ActiveCrisis;
}

const CRISIS_DEFS: CrisisDefinition[] = [
  // 1. STUMBLE
  {
    type: 'stumble',
    canTrigger: (s) => s.world.milesWalked > 10,
    chance: (s) => {
      let base = 0.03;
      if (s.world.milesWalked > 100) base = 0.08;
      if (s.world.milesWalked > 200) base = 0.15;
      if (s.player.stamina < 30) base *= 1.5;
      if (s.player.pain > 60) base *= 1.3;
      return base;
    },
    build: (s) => {
      const allyNum = getAllyNearby(s);
      const allyName = allyNum ? getAllyName(s, allyNum) : '';
      const options: CrisisOption[] = [
        {
          id: 'catch', label: 'Catch yourself', description: '-5 stamina, -3 pain',
          effects: { stamina: -5, pain: 3 }, requiresAlly: false,
          narrative: 'Your hand hits asphalt. Skin tears. You don\'t care. You\'re walking.',
        },
        {
          id: 'fight', label: 'Fight through it', description: '-8 stamina, +5 pain, +3 morale',
          effects: { stamina: -8, pain: 5, morale: 3 }, requiresAlly: false,
          narrative: 'You go down to one knee. Force yourself up. The crowd gasps. You keep walking.',
        },
        {
          id: 'ally_help', label: `${allyName} catches you`, description: 'No cost to you',
          effects: { allyStamina: -3, allyRelationship: 5, allyStrain: 12 }, requiresAlly: true,
          narrative: `${allyName} grabs your arm. Pulls you upright. "I got you." You keep walking.`,
        },
      ];
      return {
        type: 'stumble', title: 'STUMBLE',
        description: 'Your foot catches on a crack in the road. You pitch forward. The ground rushes up.',
        options, timeLimit: 0.5, timeRemaining: 0.5, speedOverride: 2.0,
        defaultEffects: { morale: -10, warningRisk: 1.0 },
        defaultNarrative: 'You stumble. Your speed drops. The soldier\'s voice is already speaking.',
      };
    },
  },

  // 2. FALLING ASLEEP
  {
    type: 'falling_asleep',
    canTrigger: (s) => s.player.clarity < 40,
    chance: (s) => (100 - s.player.clarity) / 500,
    build: (s) => {
      const allyNum = getAllyNearby(s);
      const allyName = allyNum ? getAllyName(s, allyNum) : '';
      const options: CrisisOption[] = [
        {
          id: 'bite', label: 'Bite your tongue', description: '+10 pain, +15 clarity',
          effects: { pain: 10, clarity: 15 }, requiresAlly: false,
          narrative: 'Pain. Sharp. Real. The world snaps back into focus.',
        },
        {
          id: 'slap', label: 'Slap your face', description: '+5 pain, +10 clarity, -3 morale',
          effects: { pain: 5, clarity: 10, morale: -3 }, requiresAlly: false,
          narrative: 'The sting brings tears. But your eyes are open.',
        },
        {
          id: 'let_it', label: 'Let it happen', description: 'Speed 3.0 for 5 min, 30% warning risk',
          effects: { speedOverride: 3.0, speedDuration: 5, warningRisk: 0.3 }, requiresAlly: false,
          narrative: 'You slip into a walking dream. Your feet move without you. When you wake, you\'ve lost time.',
        },
        {
          id: 'ally_help', label: `${allyName} keeps you walking`, description: 'No cost to you',
          effects: { allyStamina: -5, allyRelationship: 10, allyStrain: 12 }, requiresAlly: true,
          narrative: `${allyName} puts their arm around your shoulders. "Stay with me. Talk to me. Stay on the road."`,
        },
      ];
      return {
        type: 'falling_asleep', title: 'FALLING ASLEEP',
        description: 'Your eyelids are anvils. The road blurs. Your legs move on autopilot but your speed is dropping...',
        options, timeLimit: 1.0, timeRemaining: 1.0, speedOverride: 3.5,
        defaultEffects: { morale: -15, warningRisk: 1.0, speedOverride: 2.5, speedDuration: 3 },
        defaultNarrative: 'You fall asleep on your feet. The warning comes before you even know it.',
      };
    },
  },

  // 3. BLISTER BURST
  {
    type: 'blister_burst',
    canTrigger: (s) => s.world.milesWalked > 25 && s.player.pain > 30,
    chance: (s) => s.player.pain / 300,
    build: (s) => {
      const allyNum = getAllyNearby(s);
      const allyName = allyNum ? getAllyName(s, allyNum) : '';
      const options: CrisisOption[] = [
        {
          id: 'ignore', label: 'Keep walking', description: '+15 pain, stamina drain x1.3 for 30 min',
          effects: { pain: 15, staminaDrainMult: 1.3, staminaDrainDuration: 30 }, requiresAlly: false,
          narrative: 'Blood in your shoe. You know it\'s there. You walk on it anyway.',
        },
        {
          id: 'slow', label: 'Slow down and adjust', description: 'Speed 3.5 for 3 min (warning risk!), +5 pain',
          effects: { pain: 5, speedOverride: 3.5, speedDuration: 3 }, requiresAlly: false,
          narrative: 'You slow to adjust your shoe. The seconds stretch. The soldier watches.',
        },
        {
          id: 'medical', label: 'Use medical supplies', description: 'Burns food cooldown, +3 pain, +5 stamina',
          effects: { pain: 3, stamina: 5 }, requiresAlly: false,
          narrative: 'You get bandages from the belt. Wrap your foot while walking. Not easy, but it works.',
        },
        {
          id: 'ally_help', label: `${allyName} helps bandage`, description: 'No pain',
          effects: { allyStamina: -4, allyStrain: 12 }, requiresAlly: true,
          narrative: `${allyName} walks beside you, helping wrap the bandage. "Don't look at it," they say.`,
        },
      ];
      return {
        type: 'blister_burst', title: 'BLISTER BURST',
        description: 'Something pops inside your shoe. Wet. Hot. You can feel blood pooling around your toes.',
        options, timeLimit: 2.0, timeRemaining: 2.0,
        defaultEffects: { pain: 20, staminaDrainMult: 1.3, staminaDrainDuration: 30 },
        defaultNarrative: 'You don\'t deal with it. The blood soaks through your sock. Every step is fire.',
      };
    },
  },

  // 4. CRAMP LOCKUP
  {
    type: 'cramp_lockup',
    canTrigger: (s) => s.world.milesWalked > 30,
    chance: (s) => s.world.milesWalked > 50 ? 0.08 : 0.05,
    build: (s) => {
      const allyNum = getAllyNearby(s);
      const allyName = allyNum ? getAllyName(s, allyNum) : '';
      const options: CrisisOption[] = [
        {
          id: 'walk_off', label: 'Walk it off', description: '-10 stamina, +15 pain, speed back in 2 min',
          effects: { stamina: -10, pain: 15, speedOverride: 3.5, speedDuration: 2 }, requiresAlly: false,
          narrative: 'You grit your teeth and push. The muscle screams. You scream back.',
        },
        {
          id: 'stretch', label: 'Stretch it out', description: 'Speed 2.5 for 1 min (warning risk!), +5 pain',
          effects: { pain: 5, speedOverride: 2.5, speedDuration: 1 }, requiresAlly: false,
          narrative: 'You stop. Stretch the calf. The soldier\'s eyes are on you. The seconds crawl.',
        },
        {
          id: 'ally_help', label: `${allyName} supports you`, description: 'Speed restored, +8 pain',
          effects: { pain: 8, allyStamina: -3, allyStrain: 12 }, requiresAlly: true,
          narrative: `${allyName} grabs your arm, keeps you moving at pace. "Lean on me."`,
        },
      ];
      return {
        type: 'cramp_lockup', title: 'CRAMP',
        description: 'A cramp seizes your calf. The muscle locks solid. Your speed plummets.',
        options, timeLimit: 1.5, timeRemaining: 1.5, speedOverride: 3.0,
        defaultEffects: { pain: 20, morale: -10, warningRisk: 1.0, speedOverride: 3.0, speedDuration: 5 },
        defaultNarrative: 'The cramp doesn\'t let go. Your speed drops. The warning comes.',
      };
    },
  },

  // 5. VOMITING
  {
    type: 'vomiting',
    canTrigger: (s) => s.player.hunger < 15 || s.world.milesWalked > 100,
    chance: (s) => {
      if (s.player.hunger < 15) return 0.10;
      return 0.02;
    },
    build: (s) => {
      const allyNum = getAllyNearby(s);
      const allyName = allyNum ? getAllyName(s, allyNum) : '';
      const options: CrisisOption[] = [
        {
          id: 'push', label: 'Push through it', description: '-15 hydration, -10 hunger, -5 stamina',
          effects: { hydration: -15, hunger: -10, stamina: -5 }, requiresAlly: false,
          narrative: 'It\'s violent. Brief. You wipe your mouth and walk.',
        },
        {
          id: 'stop', label: 'Stop and let it pass', description: 'Almost guaranteed warning, less stat loss',
          effects: { hydration: -8, stamina: -3, warningRisk: 0.9 }, requiresAlly: false,
          narrative: 'You bend double on the road. The seconds tick. You hear the soldier\'s radio crackle.',
        },
        {
          id: 'ally_help', label: `${allyName} shields you`, description: 'No warning risk',
          effects: { hydration: -10, allyStamina: -2, allyStrain: 12 }, requiresAlly: true,
          narrative: `${allyName} moves between you and the halftrack. "Eyes on me, not them." You vomit behind their back.`,
        },
      ];
      return {
        type: 'vomiting', title: 'VOMITING',
        description: 'Your stomach heaves. Bile rises. You\'re about to lose everything in your gut.',
        options, timeLimit: 1.0, timeRemaining: 1.0, speedOverride: 1.5,
        defaultEffects: { hydration: -20, hunger: -15, stamina: -8, warningRisk: 1.0 },
        defaultNarrative: 'You vomit on the road. The soldiers don\'t look away. The warning comes.',
      };
    },
  },

  // 6. PANIC ATTACK
  {
    type: 'panic_attack',
    canTrigger: (s) => s.player.morale < 25,
    chance: (s) => s.player.morale < 15 ? 0.25 : 0.10,
    build: (s) => {
      const allyNum = getAllyNearby(s);
      const allyName = allyNum ? getAllyName(s, allyNum) : '';
      const options: CrisisOption[] = [
        {
          id: 'prize', label: 'Think about the Prize', description: '+8 morale, -3 clarity',
          effects: { morale: 8, clarity: -3 }, requiresAlly: false,
          narrative: 'You hold onto it. The image. The reason. It pulls you back from the edge.',
        },
        {
          id: 'focus', label: 'Focus on your body', description: '+5 morale, -5 stamina',
          effects: { morale: 5, stamina: -5 }, requiresAlly: false,
          narrative: 'Left foot. Right foot. Left foot. Right foot. Just that. Nothing else.',
        },
        {
          id: 'rage', label: 'Rage', description: '+10 morale now, -5 later, +5 pain',
          effects: { morale: 10, pain: 5, speedOverride: 5.0, speedDuration: 5 }, requiresAlly: false,
          narrative: 'The fear becomes anger. You walk faster. Harder. Daring the road to stop you.',
        },
        {
          id: 'ally_help', label: `${allyName} talks you down`, description: '+15 morale',
          effects: { morale: 15, allyStamina: -2, allyStrain: 12 }, requiresAlly: true,
          narrative: `${allyName} starts talking. About home. About nothing. About everything. The panic recedes.`,
        },
      ];
      return {
        type: 'panic_attack', title: 'PANIC ATTACK',
        description: 'Your heart is hammering. The road is closing in. You can\'t breathe. You can\'t think. You can\'t—',
        options, timeLimit: 2.0, timeRemaining: 2.0,
        defaultEffects: { morale: -15, speedOverride: 3.0, speedDuration: 5 },
        defaultNarrative: 'The panic takes you. Your speed drops. Your legs feel like they belong to someone else.',
      };
    },
  },

  // 7. BATHROOM EMERGENCY
  {
    type: 'bathroom_emergency',
    canTrigger: (s) => s.player.bladder >= 100,
    chance: () => 1.0, // Always triggers when bladder hits 100
    build: (s) => {
      const allyNum = getAllyNearby(s);
      const allyName = allyNum ? getAllyName(s, allyNum) : '';
      const options: CrisisOption[] = [
        {
          id: 'hold', label: 'Hold it', description: '+3 pain, stamina drain x1.2 for 10 min',
          effects: { pain: 3, staminaDrainMult: 1.2, staminaDrainDuration: 10 }, requiresAlly: false,
          narrative: 'You clench your teeth. Your body hates you for it.',
        },
        {
          id: 'go', label: 'Go while walking', description: 'Bladder resets, -10 morale',
          effects: { morale: -10, bladderReset: true }, requiresAlly: false,
          narrative: 'You let go. You don\'t stop walking. The shame is nothing compared to the relief.',
        },
        {
          id: 'request', label: 'Request a stop', description: '...',
          effects: { morale: -3 }, requiresAlly: false,
          narrative: 'There are no stops. There are no breaks. There is only the Walk.',
        },
        {
          id: 'ally_help', label: `${allyName} covers for you`, description: 'Bladder resets, no shame',
          effects: { bladderReset: true, allyStamina: -2, allyStrain: 5 }, requiresAlly: true,
          narrative: `${allyName} drifts beside you, blocking the view. "Everyone does it," they say. "Everyone."`,
        },
      ];
      return {
        type: 'bathroom_emergency', title: 'BATHROOM EMERGENCY',
        description: 'Your bladder is screaming. You can\'t hold it much longer. There are no stops on the Walk.',
        options, timeLimit: 3.0, timeRemaining: 3.0, speedOverride: 3.5,
        defaultEffects: { morale: -15, bladderReset: true },
        defaultNarrative: 'You can\'t hold it anymore. It happens. You don\'t stop walking. Nobody says anything.',
      };
    },
  },

  // 8. HYPOTHERMIA
  {
    type: 'hypothermia',
    canTrigger: (s) => (s.world.weather === 'rain' || s.world.weather === 'heavy_rain' || s.world.weather === 'cold')
      && s.world.hoursElapsed > 12 && s.player.stamina < 50,
    chance: () => 0.08,
    build: (s) => {
      const allyNum = getAllyNearby(s);
      const allyName = allyNum ? getAllyName(s, allyNum) : '';
      const options: CrisisOption[] = [
        {
          id: 'speed_up', label: 'Speed up to warm up', description: '-15 stamina, resolved',
          effects: { stamina: -15, speedOverride: 5.5, speedDuration: 10 }, requiresAlly: false,
          narrative: 'You walk faster. The heat builds. The cold retreats.',
        },
        {
          id: 'tough', label: 'Tough it out', description: 'Stamina drain x1.5 for 30 min, +5 pain',
          effects: { pain: 5, staminaDrainMult: 1.5, staminaDrainDuration: 30 }, requiresAlly: false,
          narrative: 'You shiver. You walk. You endure.',
        },
        {
          id: 'ally_help', label: `${allyName} shares warmth`, description: 'Both get reduced drain',
          effects: { staminaDrainMult: 0.8, staminaDrainDuration: 20, allyStamina: -3, allyStrain: 12 }, requiresAlly: true,
          narrative: `${allyName} walks shoulder to shoulder. The warmth is barely anything. It's everything.`,
        },
      ];
      return {
        type: 'hypothermia', title: 'HYPOTHERMIA',
        description: 'You can\'t stop shivering. Your fingers are numb. The cold is inside you now.',
        options, timeLimit: 3.0, timeRemaining: 3.0,
        defaultEffects: { stamina: -20, pain: 8, staminaDrainMult: 1.5, staminaDrainDuration: 30 },
        defaultNarrative: 'The cold takes hold. Your body burns through energy trying to stay warm.',
      };
    },
  },

  // 9. ALLY STUMBLE (moral tradeoff)
  {
    type: 'ally_stumble',
    canTrigger: (s) => {
      for (const allyNum of s.player.alliances) {
        const w = s.walkers.find(ws => ws.walkerNumber === allyNum);
        if (w && w.alive && (w.stamina < 25 || w.warnings >= 2) && w.position === s.player.position) return true;
      }
      return false;
    },
    chance: () => 0.30,
    build: (s) => {
      // Find the struggling ally
      let targetNum = 0;
      for (const allyNum of s.player.alliances) {
        const w = s.walkers.find(ws => ws.walkerNumber === allyNum);
        if (w && w.alive && (w.stamina < 25 || w.warnings >= 2) && w.position === s.player.position) {
          targetNum = allyNum;
          break;
        }
      }
      const allyName = getAllyName(s, targetNum);
      const options: CrisisOption[] = [
        {
          id: 'help', label: `Help ${allyName}`, description: '-8 stamina, they get +10 stamina',
          effects: { stamina: -8, allyStamina: 10, allyRelationship: 10, allySpeedBoost: true, speedOverride: 3.5, speedDuration: 5 },
          requiresAlly: false,
          narrative: `You grab ${allyName}. Pull them forward. It costs you everything but you do it anyway.`,
        },
        {
          id: 'share_food', label: 'Give them your food', description: 'Burns food cooldown',
          effects: { allyStamina: 10, allyHunger: 15, allyRelationship: 8 }, requiresAlly: false,
          narrative: `You hand your rations to ${allyName}. Your stomach growls. Their eyes say thank you.`,
        },
        {
          id: 'encourage', label: 'Encourage them', description: 'Small help, no cost',
          effects: { allyStamina: 5, allyMorale: 5 }, requiresAlly: false,
          narrative: `"You can do this. We can do this. Keep walking." ${allyName} nods.`,
        },
        {
          id: 'let_fall', label: 'Let them fall', description: 'Alliance breaks. -20 morale.',
          effects: { morale: -20, breakAlliance: true }, requiresAlly: false,
          narrative: `You look away. You keep walking. You feel the exact moment you stop being a decent person.`,
        },
      ];
      return {
        type: 'ally_stumble', title: `${allyName.toUpperCase()} IS STRUGGLING`,
        description: `${allyName} is faltering. Their speed is dropping. You can see it in their eyes — they're close to giving up.`,
        options, timeLimit: 2.0, timeRemaining: 2.0,
        targetWalker: targetNum,
        defaultEffects: { morale: -10 },
        defaultNarrative: `You don't respond. ${allyName} stumbles on alone.`,
      };
    },
  },

  // 10. STRANGER'S PLEA
  {
    type: 'stranger_plea',
    canTrigger: (s) => {
      return s.walkers.some(w => {
        if (!w.alive || w.isAlliedWithPlayer) return false;
        if (w.position !== s.player.position) return false;
        if (w.relationship < 20) return false;
        if (w.stamina > 15) return false;
        const data = getWalkerData(s, w.walkerNumber);
        if (!data || data.tier === 3) return false;
        return true;
      });
    },
    chance: () => 0.30,
    build: (s) => {
      const target = s.walkers.find(w => {
        if (!w.alive || w.isAlliedWithPlayer) return false;
        if (w.position !== s.player.position) return false;
        if (w.relationship < 20 || w.stamina > 15) return false;
        const data = getWalkerData(s, w.walkerNumber);
        return data && data.tier !== 3;
      });
      const targetNum = target?.walkerNumber || 0;
      const name = getAllyName(s, targetNum);
      const options: CrisisOption[] = [
        {
          id: 'help', label: `Help ${name}`, description: '-5 stamina, they survive longer',
          effects: { stamina: -5, allyStamina: 15, allyRelationship: 25 }, requiresAlly: false,
          narrative: `You steady ${name}. A stranger. But out here, what's a stranger?`,
        },
        {
          id: 'water', label: 'Share your water', description: 'Burns water cooldown',
          effects: { allyStamina: 8, allyRelationship: 15 }, requiresAlly: false,
          narrative: `You hand ${name} your canteen. They drink. They look at you like you're the only good thing left.`,
        },
        {
          id: 'ignore', label: 'Keep walking', description: '-5 morale',
          effects: { morale: -5 }, requiresAlly: false,
          narrative: `You walk past. ${name}'s hand reaches out. You don't take it.`,
        },
        {
          id: 'encourage', label: 'Tell them to fight', description: '+3 morale for you',
          effects: { morale: 3, allyMorale: 10 }, requiresAlly: false,
          narrative: `"Don't quit. Don't you dare quit." ${name} looks up. Something flickers in their eyes.`,
        },
      ];
      return {
        type: 'stranger_plea', title: `${name.toUpperCase()} NEEDS HELP`,
        description: `${name} is barely walking. They catch your eye. The look on their face — it's not quite begging. Not yet.`,
        options, timeLimit: 3.0, timeRemaining: 3.0,
        targetWalker: targetNum,
        defaultEffects: { morale: -3 },
        defaultNarrative: `${name} fades behind you. You don't look back.`,
      };
    },
  },
];

// ============================================================
// BLADDER SYSTEM
// ============================================================

export function updateBladder(state: GameState, gameMinutes: number) {
  const p = state.player;
  if (p.activeCrisis?.type === 'bathroom_emergency') return; // Don't fill during the crisis

  let fillRate = 1.0; // base: +1 per 5 game-minutes
  if (p.hydration > 90) fillRate = 3.0;
  else if (p.hydration > 70) fillRate = 2.0;
  if (state.world.weather === 'cold') fillRate *= 1.5;
  if (state.world.weather === 'rain' || state.world.weather === 'heavy_rain') fillRate *= 1.3;

  p.bladder = Math.min(100, p.bladder + (gameMinutes / 5) * fillRate);

  // Warning at 80
  if (p.bladder >= 80 && p.bladder - (gameMinutes / 5) * fillRate < 80) {
    addNarrative(state, 'Your bladder is insistent. Not yet an emergency. But soon.', 'thought');
  }
}

// ============================================================
// TEMP EFFECTS (speed overrides, stamina drain multipliers, etc.)
// ============================================================

export function updateTempEffects(state: GameState, gameMinutes: number) {
  const effects = state.player.tempEffects;
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].remaining -= gameMinutes;
    if (effects[i].remaining <= 0) {
      // Delayed morale crash (from Rage)
      if (effects[i].type === 'morale_delayed') {
        state.player.morale = Math.max(0, state.player.morale + effects[i].value);
      }
      effects.splice(i, 1);
    }
  }
}

export function getActiveSpeedOverride(state: GameState): number | null {
  const eff = state.player.tempEffects.find(e => e.type === 'speed_override');
  return eff ? eff.value : null;
}

export function getActiveStaminaDrainMult(state: GameState): number {
  const eff = state.player.tempEffects.find(e => e.type === 'stamina_drain_mult');
  return eff ? eff.value : 1.0;
}

// ============================================================
// CHECK FOR NEW CRISIS
// ============================================================

export function checkForCrisis(state: GameState, _gameMinutes: number) {
  const p = state.player;
  if (p.activeCrisis) return; // Already in a crisis
  if (!p.alive) return;
  if (state.activeApproach) return; // Don't trigger crisis during NPC approach
  if (state.activeScene) return;    // Don't trigger crisis during scene overlay

  const currentMile = Math.floor(state.world.milesWalked);
  if (currentMile <= lastCrisisCheckMile) return;
  lastCrisisCheckMile = currentMile;

  // Respect minimum gap
  const gap = minCrisisGap(state.world.currentAct);
  if (state.world.milesWalked - p.lastCrisisMile < gap) return;

  // Collect eligible crises
  const eligible = CRISIS_DEFS.filter(d => d.canTrigger(state));
  if (eligible.length === 0) return;

  // Weighted random selection: each crisis rolls its own chance
  // Pick the first one that triggers (shuffled for fairness)
  const shuffled = eligible.sort(() => Math.random() - 0.5);
  for (const def of shuffled) {
    if (Math.random() < def.chance(state)) {
      p.activeCrisis = def.build(state);
      p.lastCrisisMile = state.world.milesWalked;
      // Force game speed to 1x during crisis
      state.gameSpeed = 1;
      addNarrative(state, `⚠ ${p.activeCrisis.title}`, 'event');
      return;
    }
  }
}

// ============================================================
// UPDATE ACTIVE CRISIS (timer countdown)
// ============================================================

export function updateActiveCrisis(state: GameState, gameMinutes: number) {
  const crisis = state.player.activeCrisis;
  if (!crisis) return;

  crisis.timeRemaining -= gameMinutes;

  if (crisis.timeRemaining <= 0) {
    timeoutCrisis(state);
  }
}

// ============================================================
// RESOLVE CRISIS (player chose an option)
// ============================================================

export function resolveCrisis(state: GameState, optionId: string) {
  const crisis = state.player.activeCrisis;
  if (!crisis) return;

  const option = crisis.options.find(o => o.id === optionId);
  if (!option) return;

  // Check ally requirement
  if (option.requiresAlly && !getAllyNearby(state)) return;

  applyEffects(state, option.effects, crisis.targetWalker);
  addNarrative(state, option.narrative, 'narration');

  // Special: blister medical burns food cooldown
  if (crisis.type === 'blister_burst' && optionId === 'medical') {
    state.player.foodCooldown = 30;
  }
  // Special: ally_stumble share_food burns food cooldown
  if (crisis.type === 'ally_stumble' && optionId === 'share_food') {
    state.player.foodCooldown = 30;
  }
  // Special: stranger share water burns water cooldown
  if (crisis.type === 'stranger_plea' && optionId === 'water') {
    state.player.waterCooldown = 15;
  }
  // Special: rage has delayed morale crash
  if (crisis.type === 'panic_attack' && optionId === 'rage') {
    state.player.tempEffects.push({ type: 'morale_delayed', value: -5, remaining: 30 });
  }
  // Special: bathroom hold doesn't reset bladder
  if (crisis.type === 'bathroom_emergency' && optionId === 'hold') {
    // bladder stays at 100, will re-trigger in a few miles
  }

  state.player.activeCrisis = null;
  state.lastCrisisResolveMile = state.world.milesWalked;
}

// ============================================================
// TIMEOUT CRISIS (timer expired)
// ============================================================

function timeoutCrisis(state: GameState) {
  const crisis = state.player.activeCrisis;
  if (!crisis) return;

  applyEffects(state, crisis.defaultEffects, crisis.targetWalker);
  addNarrative(state, crisis.defaultNarrative, 'warning');
  state.player.activeCrisis = null;
  state.lastCrisisResolveMile = state.world.milesWalked;
}

// ============================================================
// APPLY EFFECTS
// ============================================================

function applyEffects(state: GameState, effects: CrisisEffects, targetWalker?: number) {
  const p = state.player;

  // Player stat deltas
  if (effects.stamina) p.stamina = Math.max(0, Math.min(100, p.stamina + effects.stamina));
  if (effects.pain) p.pain = Math.min(100, Math.max(0, p.pain + effects.pain));
  if (effects.morale) p.morale = Math.max(0, Math.min(100, p.morale + effects.morale));
  if (effects.hydration) p.hydration = Math.max(0, Math.min(100, p.hydration + effects.hydration));
  if (effects.hunger) p.hunger = Math.max(0, Math.min(100, p.hunger + effects.hunger));
  if (effects.clarity) p.clarity = Math.max(0, Math.min(100, p.clarity + effects.clarity));

  // Warning risk
  if (effects.warningRisk && Math.random() < effects.warningRisk) {
    p.warnings = Math.min(3, p.warnings + 1);
    if (p.warnings >= 3) {
      p.alive = false;
      state.screen = 'gameover';
    } else {
      addNarrative(state, `"Warning. Walker #100. Warning number ${p.warnings}."`, 'warning');
      p.morale = Math.max(0, p.morale - 10);
    }
  }

  // Speed override (temp effect)
  if (effects.speedOverride && effects.speedDuration) {
    // Remove any existing speed override
    p.tempEffects = p.tempEffects.filter(e => e.type !== 'speed_override');
    p.tempEffects.push({ type: 'speed_override', value: effects.speedOverride, remaining: effects.speedDuration });
  }

  // Stamina drain multiplier (temp effect)
  if (effects.staminaDrainMult && effects.staminaDrainDuration) {
    p.tempEffects = p.tempEffects.filter(e => e.type !== 'stamina_drain_mult');
    p.tempEffects.push({ type: 'stamina_drain_mult', value: effects.staminaDrainMult, remaining: effects.staminaDrainDuration });
  }

  // Bladder reset
  if (effects.bladderReset) {
    p.bladder = 0;
  }

  // Ally effects
  const allyNum = targetWalker || getAllyNearby(state);
  if (allyNum) {
    const w = state.walkers.find(ws => ws.walkerNumber === allyNum);
    if (w) {
      if (effects.allyStamina) w.stamina = Math.max(0, Math.min(100, w.stamina + effects.allyStamina));
      if (effects.allyMorale) w.morale = Math.max(0, Math.min(100, w.morale + effects.allyMorale));
      if (effects.allyHunger) {
        // NPC doesn't track hunger separately, apply as stamina
        w.stamina = Math.min(100, w.stamina + effects.allyHunger * 0.5);
      }
      if (effects.allyRelationship) {
        w.relationship = Math.max(-100, Math.min(100, w.relationship + effects.allyRelationship));
        if (effects.allyRelationship > 0) {
          w.playerActions.push(`Helped during crisis at mile ${Math.round(state.world.milesWalked)}`);
        }
      }
      if (effects.allySpeedBoost) {
        w.speed = Math.min(5.0, w.speed + 0.8);
      }
      if (effects.allyStrain) {
        w.allyStrain = Math.min(100, w.allyStrain + effects.allyStrain);
        // Check if alliance breaks from strain
        if (w.allyStrain > 80 && Math.random() < 0.20) {
          w.isAlliedWithPlayer = false;
          w.relationship = Math.max(0, w.relationship - 30);
          p.alliances = p.alliances.filter(n => n !== w.walkerNumber);
          const name = getWalkerData(state, w.walkerNumber)?.name || `Walker #${w.walkerNumber}`;
          addNarrative(state, `${name} pulls away. "I can't keep carrying you. I'm sorry." The alliance is broken.`, 'narration');
        } else if (w.allyStrain > 60 && Math.random() < 0.3) {
          const name = getWalkerData(state, w.walkerNumber)?.name || `Walker #${w.walkerNumber}`;
          addNarrative(state, `${name} gives you a look. Tired. Strained. "I'm here for you. But I need you to be here for me too."`, 'overheard');
        }
      }

      // Break alliance
      if (effects.breakAlliance) {
        w.isAlliedWithPlayer = false;
        w.relationship = 0;
        p.alliances = p.alliances.filter(n => n !== w.walkerNumber);
      }
    }
  }
}
