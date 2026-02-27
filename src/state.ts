// ============================================================
// The Long Walk — Game State Management
// ============================================================

import { GameState, PlayerState, WalkerState, WalkerData, WorldState, RelationshipTier } from './types';
import { ALL_WALKERS } from './data/walkers';

export function createDefaultPlayer(): PlayerState {
  return {
    name: 'Walker',
    age: 17,
    reason: 'unknown',
    prize: '',
    walkerNumber: 100,
    stamina: 100,
    speed: 4.3,
    targetSpeed: 4.3,
    effort: 62,
    hydration: 100,
    hunger: 100,
    pain: 0,
    morale: 75,
    clarity: 100,
    warnings: 0,
    warningTimer: 0,
    slowAccum: 0,
    lastWarningTime: -999,
    alive: true,
    position: 'middle',
    foodCooldown: 0,
    waterCooldown: 0,
    alliances: [],
    bondedAlly: null,
    enemies: [],
    flags: {},
    bladder: 0,
    bowel: 0,
    activeCrisis: null,
    lastCrisisMile: 0,
    tempEffects: [],
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
    stamina: Math.min(100, baseStamina + (Math.random() * 15)),
    speed: 4.3 + Math.random() * 0.6,
    pain: 0,
    morale: 50 + Math.random() * 40,
    clarity: 100,
    warnings: 0,
    warningTimer: 0,
    position: data.walkingPosition,
    relationship: data.initialRelationship,
    behavioralState: 'steady',
    isAlliedWithPlayer: false,
    isEnemy: false,
    isBonded: false,
    allyStrain: 0,
    conversationFlags: {},
    eliminatedAtMile: null,
    conversationCount: 0,
    revealedFacts: [],
    playerActions: [],
    lastDeclineNarrativeMile: 0,
    lastStoryMile: 0,
    lastEncourageMile: 0,
    walkingTogether: false,
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
    lastOverheardMile: 0,
    overhearInProgress: false,
    activeScene: null,
    activeApproach: null,
    lastApproachMile: 0,
    approachInProgress: false,
    lastWarningMile: 0,
    lastCrisisResolveMile: 0,
    lastEnemyActionMile: 0,
  };
}

// --- State Accessors ---

// O(1) walker data lookup map — built once per game, avoids 300+ .find() calls per tick
let walkerDataMap: Map<number, WalkerData> | null = null;

export function getAliveWalkers(state: GameState): WalkerState[] {
  return state.walkers.filter(w => w.alive);
}

export function getWalkerData(state: GameState, num: number): WalkerData | undefined {
  if (!walkerDataMap) {
    walkerDataMap = new Map(state.walkerData.map(d => [d.walkerNumber, d]));
  }
  return walkerDataMap.get(num);
}

export function getWalkerState(state: GameState, num: number): WalkerState | undefined {
  return state.walkers.find(w => w.walkerNumber === num);
}

export function getNearbyWalkers(state: GameState): WalkerState[] {
  const atPosition = state.walkers.filter(w =>
    w.alive && w.position === state.player.position
  );
  // Sort by tier so Tier 1 characters appear first
  const tierOf = (w: WalkerState) => getWalkerData(state, w.walkerNumber)?.tier ?? 3;
  return atPosition.sort((a, b) => tierOf(a) - tierOf(b));
}

/** Reset walker data map (for headless testing) */
export function resetWalkerDataMap() {
  walkerDataMap = null;
}

export function getWalkersRemaining(state: GameState): number {
  return state.walkers.filter(w => w.alive).length + (state.player.alive ? 1 : 0);
}

export function getRelationshipTier(w: WalkerState): RelationshipTier {
  if (w.isBonded) return 'bonded';
  if (w.isAlliedWithPlayer) return 'allied';
  if (w.relationship >= 50) return 'close';
  if (w.relationship >= 30) return 'friendly';
  if (w.relationship >= 10) return 'neutral';
  if (w.relationship >= -10) return 'wary';
  if (w.relationship >= -40) return 'hostile';
  return 'enemy';
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
