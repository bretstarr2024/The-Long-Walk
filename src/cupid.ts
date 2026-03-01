// ============================================================
// The Long Walk — Cupid Matchmaking System
// Player can match two NPCs into a romantic pair.
// Matches deepen over miles: spark → crush → love.
// ============================================================

import { GameState, CupidMatch } from './types';
import { addNarrative, getWalkerData, getWalkerState } from './state';
import { queueOverheardBubbles } from './ui';
import { requestOverhear } from './agentClient';
import { buildGameContext, buildWalkerProfile } from './contextBuilder';

// --- Config ---
const MIN_MILES_BETWEEN_CUPID_OVERHEARDS = 12;
const SPARK_TO_CRUSH_MILES = 20;
const CRUSH_TO_LOVE_MILES = 60;

// Track last mile checked to avoid multiple checks per mile
let lastCheckedCupidMile = 0;

// --- Romantic Scene Prompts ---

const SPARK_PROMPTS = [
  (a: string, b: string) =>
    `${a} and ${b} have a new connection forming between them. They're at the very early stages — shy glances, finding excuses to walk near each other. Show the awkward, sweet beginning of attraction through a brief exchange.`,
  (a: string, b: string) =>
    `${a} and ${b} are noticing things about each other — the way one laughs, how the other walks. Something is pulling them together. Show the first tentative spark in a short exchange.`,
  (a: string, b: string) =>
    `${a} makes a small gesture toward ${b} — steadying them, sharing something, a kind word. It means more than it should. Show this moment of connection.`,
];

const CRUSH_PROMPTS = [
  (a: string, b: string) =>
    `${a} and ${b} are clearly drawn to each other now. Walking side by side, finding reasons to talk. The other walkers have noticed. Show the growing affection in a short exchange.`,
  (a: string, b: string) =>
    `${a} is worried about ${b}'s condition. The concern goes beyond what walking partners feel. Show the deepening feelings in a brief, tender exchange.`,
  (a: string, b: string) =>
    `${a} and ${b} are laughing together in the middle of a death march. It's absurd and beautiful. Show the warmth between them.`,
];

const LOVE_PROMPTS = [
  (a: string, b: string) =>
    `${a} and ${b} are in love. On a death march. They walk as close as they can. Their conversation is intimate, tender, and bittersweet. Show a quiet moment of real love.`,
  (a: string, b: string) =>
    `${a} and ${b} are in love and they both know it. They talk about what they'd do after — knowing the odds. Show something tender and heartbreaking.`,
  (a: string, b: string) =>
    `${a} and ${b} give each other strength. Love in the middle of hell. Show a moment of genuine tenderness between two people who found each other here.`,
];

function pickRomanticPrompt(match: CupidMatch, nameA: string, nameB: string): string {
  const prompts = match.stage === 'spark' ? SPARK_PROMPTS
    : match.stage === 'crush' ? CRUSH_PROMPTS
    : LOVE_PROMPTS;
  return prompts[Math.floor(Math.random() * prompts.length)](nameA, nameB);
}

// --- Stage Advancement ---

function advanceCupidStage(match: CupidMatch, currentMile: number, state: GameState): boolean {
  const milesSinceCreation = currentMile - match.createdAtMile;
  const dataA = getWalkerData(state, match.walkerA);
  const dataB = getWalkerData(state, match.walkerB);
  const nameA = dataA?.name || `Walker #${match.walkerA}`;
  const nameB = dataB?.name || `Walker #${match.walkerB}`;

  if (match.stage === 'spark' && milesSinceCreation >= SPARK_TO_CRUSH_MILES) {
    match.stage = 'crush';
    match.stageAdvancedMile = currentMile;
    addNarrative(state, `${nameA} and ${nameB} are walking closer together now. Something has changed between them.`, 'narration');
    return true;
  }
  if (match.stage === 'crush' && milesSinceCreation >= CRUSH_TO_LOVE_MILES) {
    match.stage = 'love';
    match.stageAdvancedMile = currentMile;
    addNarrative(state, `${nameA} and ${nameB} exchange a look that says everything. They're in love.`, 'narration');
    return true;
  }
  return false;
}

// --- Public API ---

/**
 * Create a new cupid match between two walkers.
 * Called from the UI when the player completes the two-step picker.
 */
export function createCupidMatch(state: GameState, walkerANum: number, walkerBNum: number): void {
  const dataA = getWalkerData(state, walkerANum);
  const dataB = getWalkerData(state, walkerBNum);
  const nameA = dataA?.name || `Walker #${walkerANum}`;
  const nameB = dataB?.name || `Walker #${walkerBNum}`;

  const match: CupidMatch = {
    walkerA: walkerANum,
    walkerB: walkerBNum,
    stage: 'spark',
    createdAtMile: state.world.milesWalked,
    lastOverheardMile: state.world.milesWalked,
    stageAdvancedMile: state.world.milesWalked,
    heartbroken: false,
  };

  state.cupidMatches.push(match);
  state.player.lastCupidMile = state.world.milesWalked;

  addNarrative(state, `You notice the way ${nameA} keeps glancing at ${nameB}. Something stirs.`, 'narration');

  // Fire an initial romantic overhear
  fireRomanticOverhear(state, match);
}

/**
 * Check if any cupid matches need a romantic overhear conversation.
 * Called from the game loop, right after checkAmbientOverhear.
 */
export function checkCupidOverheards(state: GameState): void {
  if (!state.llmAvailable) return;
  if (state.overhearInProgress) return;

  const currentMile = Math.floor(state.world.milesWalked);
  if (currentMile <= lastCheckedCupidMile) return;
  lastCheckedCupidMile = currentMile;

  // Don't trigger during active overlays
  if (state.player.activeCrisis || state.llmDialogue || state.activeScene || state.activeApproach) return;

  for (const match of state.cupidMatches) {
    if (match.heartbroken) continue;
    const wA = getWalkerState(state, match.walkerA);
    const wB = getWalkerState(state, match.walkerB);
    if (!wA || !wA.alive || !wB || !wB.alive) continue;

    // Advance stage if ready
    advanceCupidStage(match, state.world.milesWalked, state);

    // Check overhear cooldown
    if (state.world.milesWalked - match.lastOverheardMile < MIN_MILES_BETWEEN_CUPID_OVERHEARDS) continue;

    // At least one must be at player's position
    if (wA.position !== state.player.position && wB.position !== state.player.position) continue;

    // Also respect the global overhear gap
    if (state.world.milesWalked - state.lastOverheardMile < 6) continue;

    fireRomanticOverhear(state, match);
    return; // Only one cupid overhear per mile check
  }
}

/**
 * Morale boost for matched pairs walking in the same position.
 * Called from gameTick in engine.ts.
 */
export function updateCupidCouples(state: GameState, gameMinutes: number): void {
  for (const match of state.cupidMatches) {
    if (match.heartbroken) continue;
    const wA = getWalkerState(state, match.walkerA);
    const wB = getWalkerState(state, match.walkerB);
    if (!wA || !wB || !wA.alive || !wB.alive) continue;
    if (wA.position !== wB.position) continue;

    // Morale boost scales with stage
    const boostPerMile = match.stage === 'spark' ? 1 : match.stage === 'crush' ? 2 : 3;
    const mileRate = gameMinutes / 15; // ~1 mile per 15 min at 4 mph
    const boost = boostPerMile * mileRate;
    wA.morale = Math.min(100, wA.morale + boost);
    wB.morale = Math.min(100, wB.morale + boost);
  }
}

/**
 * Handle heartbreak when a matched walker is eliminated.
 * Called from eliminateWalker in engine.ts.
 */
export function handleCupidHeartbreak(state: GameState, deadWalkerNumber: number): void {
  for (const match of state.cupidMatches) {
    if (match.heartbroken) continue;
    if (match.walkerA !== deadWalkerNumber && match.walkerB !== deadWalkerNumber) continue;

    match.heartbroken = true;

    const survivorNum = match.walkerA === deadWalkerNumber ? match.walkerB : match.walkerA;
    const survivor = getWalkerState(state, survivorNum);
    const deadData = getWalkerData(state, deadWalkerNumber);
    const survivorData = getWalkerData(state, survivorNum);

    if (!survivor || !survivor.alive || !deadData || !survivorData) continue;

    // Morale devastation scales with stage
    const moraleHit = match.stage === 'love' ? -35 : match.stage === 'crush' ? -20 : -10;
    survivor.morale = Math.max(0, survivor.morale + moraleHit);

    // Player feels it too — they made this match
    state.player.morale = Math.max(0, state.player.morale - 10);

    // Heartbreak narrative
    const lines = match.stage === 'love' ? [
      `${survivorData.name} stops walking for a moment when ${deadData.name} falls. The sound that comes from them isn't a scream. It's worse.`,
      `${survivorData.name} reaches toward where ${deadData.name} was walking. Their hand closes on empty air.`,
    ] : match.stage === 'crush' ? [
      `${survivorData.name} watches ${deadData.name} fall behind. Something breaks behind their eyes.`,
      `${survivorData.name} walks on. But the spring in their step — the one ${deadData.name} put there — is gone.`,
    ] : [
      `${survivorData.name} glances back toward where ${deadData.name} was. A connection cut short.`,
    ];

    addNarrative(state, lines[Math.floor(Math.random() * lines.length)], 'narration');
  }
}

/**
 * Get the active cupid match for a given walker (if any).
 */
export function getCupidMatch(state: GameState, walkerNumber: number): CupidMatch | undefined {
  return state.cupidMatches.find(m =>
    !m.heartbroken && (m.walkerA === walkerNumber || m.walkerB === walkerNumber)
  );
}

/** Reset module state for headless testing */
export function resetCupidGlobals(): void {
  lastCheckedCupidMile = 0;
}

// --- Internal ---

function fireRomanticOverhear(state: GameState, match: CupidMatch): void {
  const profileA = buildWalkerProfile(state, match.walkerA);
  const profileB = buildWalkerProfile(state, match.walkerB);
  if (!profileA || !profileB) return;

  const scenePrompt = pickRomanticPrompt(match, profileA.name, profileB.name);
  const gameCtx = buildGameContext(state);

  state.overhearInProgress = true;

  requestOverhear(profileA, profileB, gameCtx, scenePrompt)
    .then((result) => {
      state.overhearInProgress = false;
      if (result.error || !result.text) {
        console.log('[Cupid] Romantic overhear failed:', result.error);
        return;
      }

      match.lastOverheardMile = state.world.milesWalked;
      state.lastOverheardMile = state.world.milesWalked;

      // Parse response into speech bubbles (same format as overhear.ts)
      const rawLines = result.text.split('\n').filter(l => l.trim());
      const bubbleLines = rawLines.map(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && colonIdx < 25) {
          return { speaker: line.substring(0, colonIdx).trim(), text: line.substring(colonIdx + 1).trim() };
        }
        return { speaker: profileA.name, text: line.trim() };
      });
      queueOverheardBubbles(state, bubbleLines);
      addNarrative(state, `You overhear ${profileA.name} and ${profileB.name} in a tender moment...`, 'overheard');
    })
    .catch((err) => {
      state.overhearInProgress = false;
      console.error('[Cupid] Error:', err);
    });
}
