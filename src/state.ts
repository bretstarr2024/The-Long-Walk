// ============================================================
// The Long Walk — Game State Management
// ============================================================

import { GameState, PlayerState, WalkerState, WalkerData, WorldState } from './types';
import { ALL_WALKERS } from './data/walkers';

export function createDefaultPlayer(): PlayerState {
  return {
    name: 'Walker',
    age: 17,
    reason: 'unknown',
    prize: '',
    walkerNumber: 100,
    stamina: 100,
    speed: 4.5,
    targetSpeed: 4.5,
    hydration: 100,
    hunger: 100,
    pain: 0,
    morale: 75,
    clarity: 100,
    warnings: 0,
    warningTimer: 0,
    alive: true,
    position: 'middle',
    foodCooldown: 0,
    waterCooldown: 0,
    alliances: [],
    flags: {},
  };
}

export function createDefaultWorld(): WorldState {
  return {
    milesWalked: 0,
    hoursElapsed: 0,
    currentTime: '07:00',
    dayNumber: 1,
    isNight: false,
    weather: 'clear',
    terrain: 'flat',
    crowdDensity: 'sparse',
    crowdMood: 'excited',
    currentAct: 1,
    horrorTier: 1,
  };
}

export function createWalkerState(data: WalkerData): WalkerState {
  const baseStamina = data.physicalState === 'strong' ? 100
    : data.physicalState === 'weak' ? 70 : 85;
  return {
    walkerNumber: data.walkerNumber,
    alive: true,
    stamina: baseStamina + (Math.random() * 15),
    speed: 4.3 + Math.random() * 0.6,
    pain: 0,
    morale: 50 + Math.random() * 40,
    clarity: 100,
    warnings: 0,
    position: data.walkingPosition,
    relationship: data.initialRelationship,
    behavioralState: 'steady',
    isAlliedWithPlayer: false,
    conversationFlags: {},
    eliminatedAtMile: null,
  };
}

export function createInitialGameState(): GameState {
  const walkerData = ALL_WALKERS;
  const walkers = walkerData.map(d => createWalkerState(d));

  return {
    player: createDefaultPlayer(),
    world: createDefaultWorld(),
    walkers,
    walkerData,
    narrativeLog: [],
    activeDialogue: null,
    llmDialogue: null,
    llmAvailable: false,
    conversationHistory: [],
    eventLog: [],
    triggeredEvents: new Set(),
    eliminationCount: 0,
    gameSpeed: 1,
    isPaused: false,
    screen: 'title',
    playtimeMs: 0,
    lastTickTime: 0,
    introStep: 0,
  };
}

// --- State Accessors ---

export function getAliveWalkers(state: GameState): WalkerState[] {
  return state.walkers.filter(w => w.alive);
}

export function getWalkerData(state: GameState, num: number): WalkerData | undefined {
  return state.walkerData.find(w => w.walkerNumber === num);
}

export function getWalkerState(state: GameState, num: number): WalkerState | undefined {
  return state.walkers.find(w => w.walkerNumber === num);
}

export function getNearbyWalkers(state: GameState): WalkerState[] {
  return state.walkers.filter(w =>
    w.alive && w.position === state.player.position
  ).slice(0, 8); // max 8 nearby
}

export function getWalkersRemaining(state: GameState): number {
  return state.walkers.filter(w => w.alive).length + (state.player.alive ? 1 : 0);
}

export function addNarrative(state: GameState, text: string, type: import('./types').NarrativeType) {
  state.narrativeLog.push({
    mile: state.world.milesWalked,
    hour: state.world.hoursElapsed,
    text,
    type,
  });
  // Keep log from growing unbounded
  if (state.narrativeLog.length > 200) {
    state.narrativeLog = state.narrativeLog.slice(-150);
  }
}

export function formatTime(time: string): string {
  return time;
}

export function getTimeOfDay(hours: number): string {
  const h = (7 + hours) % 24; // walk starts at 7am
  if (h >= 6 && h < 8) return 'dawn';
  if (h >= 8 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 20) return 'evening';
  if (h >= 20 || h < 2) return 'night';
  return 'late night';
}

export function updateCurrentTime(state: GameState) {
  const totalMinutes = Math.floor(state.world.hoursElapsed * 60);
  const startHour = 7; // 7:00 AM
  const currentMinutes = (startHour * 60 + totalMinutes) % (24 * 60);
  const h = Math.floor(currentMinutes / 60);
  const m = currentMinutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  state.world.currentTime = `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  state.world.isNight = h >= 20 || h < 6;
  state.world.dayNumber = Math.floor(state.world.hoursElapsed / 24) + 1;
}
