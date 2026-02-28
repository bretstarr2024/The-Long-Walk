// ============================================================
// The Long Walk — Ambient Overhear System (LLM-generated)
// Periodically triggers overheard conversations between NPCs
// ============================================================

import { GameState } from './types';
import { addNarrative, getWalkerData, getWalkerState } from './state';
import { queueOverheardBubbles } from './ui';
import { requestOverhear } from './agentClient';
import { buildGameContext, buildWalkerProfile } from './contextBuilder';
import { NPC_RELATIONSHIPS } from './data/walkers';

// --- Config ---
const MIN_MILES_BETWEEN_OVERHEARDS = 8;   // minimum miles gap between any overheard (scripted or ambient)
const MIN_MILES_FOR_AMBIENT = 10;          // don't start ambient overheards until mile 10
const AMBIENT_CHANCE_PER_MILE = 0.12;      // ~12% chance per mile check

// Track last mile we checked to avoid multiple checks per mile
let lastCheckedMile = 0;

// Scene prompts based on game conditions
function pickScenePrompt(state: GameState): string {
  const prompts: string[] = [];

  // Always-available prompts
  prompts.push('small talk to pass the time while walking');

  // Contextual prompts
  if (state.world.isNight) {
    prompts.push('the darkness and fear of walking at night');
    prompts.push('trying to stay awake while walking in the dark');
  }
  if (state.world.weather === 'rain' || state.world.weather === 'heavy_rain') {
    prompts.push('the misery of walking in the rain');
  }
  if (state.world.weather === 'cold') {
    prompts.push('the biting cold and how it affects their walking');
  }
  if (state.eliminationCount > 0 && state.eliminationCount < 10) {
    prompts.push('the shock of walkers being eliminated around them');
  }
  if (state.eliminationCount >= 10 && state.eliminationCount < 40) {
    prompts.push('the growing numbness as more walkers fall');
  }
  if (state.eliminationCount >= 40) {
    prompts.push('how few of them are left now');
  }
  if (state.world.crowdDensity === 'heavy' || state.world.crowdDensity === 'massive') {
    prompts.push('the crowds watching them like a spectacle');
  }
  if (state.world.terrain === 'uphill') {
    prompts.push('the agony of walking uphill when every muscle screams');
  }
  if (state.world.hoursElapsed > 16) {
    prompts.push('the delirium of walking without sleep');
  }
  if (state.world.hoursElapsed > 30) {
    prompts.push('questioning whether The Prize is worth any of this');
  }
  if (state.world.milesWalked > 200) {
    prompts.push('memories of home and what they left behind');
    prompts.push('what they would do if they won The Prize');
  }

  return prompts[Math.floor(Math.random() * prompts.length)];
}

/**
 * Check if we should trigger an ambient LLM overhear.
 * Called from the game loop. Fires at most once per mile gap.
 */
export function checkAmbientOverhear(state: GameState): void {
  // Don't run if server is down, too early, or already in progress
  if (!state.llmAvailable) return;
  if (state.world.milesWalked < MIN_MILES_FOR_AMBIENT) return;
  if (state.overhearInProgress) return;

  // Only check once per mile
  const currentMile = Math.floor(state.world.milesWalked);
  if (currentMile <= lastCheckedMile) return;
  lastCheckedMile = currentMile;

  // Respect minimum gap from last overheard (scripted or ambient)
  if (state.world.milesWalked - state.lastOverheardMile < MIN_MILES_BETWEEN_OVERHEARDS) return;

  // Don't trigger during active overlays
  if (state.player.activeCrisis || state.llmDialogue || state.activeScene || state.activeApproach) return;

  // Check for arc-aware relationship stage first (before random chance)
  let arcWalkerA: number | null = null;
  let arcWalkerB: number | null = null;
  let arcScenePrompt: string | null = null;
  let arcPreviousContext: string | null = null;
  let arcStageKey: string | null = null;

  for (const rel of NPC_RELATIONSHIPS) {
    const wA = getWalkerState(state, rel.walkerA);
    const wB = getWalkerState(state, rel.walkerB);
    if (!wA || !wA.alive || !wB || !wB.alive) continue;

    for (const stage of rel.stages) {
      if (state.triggeredEvents.has(`npc_rel_${stage.id}`)) continue;
      if (state.world.milesWalked < stage.mileRange[0]) continue;
      if (state.world.milesWalked > stage.mileRange[1]) continue;

      // Both walkers need to be at player's position (or nearby)
      if (wA.position !== state.player.position && wB.position !== state.player.position) continue;

      // Found a ready arc stage — defer triggeredEvents.add to success handler
      arcWalkerA = rel.walkerA;
      arcWalkerB = rel.walkerB;
      arcScenePrompt = stage.scenePrompt;
      arcPreviousContext = stage.previousContext || null;
      arcStageKey = `npc_rel_${stage.id}`;
      break;
    }
    if (arcWalkerA !== null) break;
  }

  // If no arc stage is ready, use random selection with random chance
  if (arcWalkerA === null) {
    if (Math.random() > AMBIENT_CHANCE_PER_MILE) return;
  }

  // Pick walkers: arc pair or random pair
  let walkerA: { walkerNumber: number };
  let walkerB: { walkerNumber: number };

  if (arcWalkerA !== null && arcWalkerB !== null) {
    walkerA = { walkerNumber: arcWalkerA };
    walkerB = { walkerNumber: arcWalkerB };
  } else {
    // Pick two alive Tier 1/2 walkers at the player's position
    const candidates = state.walkers.filter(w => {
      if (!w.alive) return false;
      if (w.position !== state.player.position) return false;
      const data = getWalkerData(state, w.walkerNumber);
      return data && (data.tier === 1 || data.tier === 2);
    });

    if (candidates.length < 2) return;

    // Shuffle and pick two
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    walkerA = shuffled[0];
    walkerB = shuffled[1];
  }

  const profileA = buildWalkerProfile(state, walkerA.walkerNumber);
  const profileB = buildWalkerProfile(state, walkerB.walkerNumber);
  if (!profileA || !profileB) return;

  // Build scene prompt: arc-specific or random
  let scenePrompt: string;
  if (arcScenePrompt) {
    scenePrompt = arcScenePrompt;
    if (arcPreviousContext) {
      scenePrompt = `Previously: ${arcPreviousContext}\n\nNow: ${scenePrompt}`;
    }
  } else {
    scenePrompt = pickScenePrompt(state);
  }

  const gameCtx = buildGameContext(state);

  // Fire and forget — mark in progress to prevent overlap
  state.overhearInProgress = true;

  requestOverhear(profileA, profileB, gameCtx, scenePrompt)
    .then((result) => {
      state.overhearInProgress = false;
      if (result.error || !result.text) {
        console.log('[Overhear] LLM overhear failed:', result.error);
        return; // Don't consume arc stage — it can retry next mile
      }

      // Only consume the mile gap and arc stage on success
      state.lastOverheardMile = state.world.milesWalked;
      if (arcStageKey) state.triggeredEvents.add(arcStageKey);

      // Parse response into speech bubbles
      const rawLines = result.text.split('\n').filter(l => l.trim());
      const bubbleLines = rawLines.map(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && colonIdx < 25) {
          return { speaker: line.substring(0, colonIdx).trim(), text: line.substring(colonIdx + 1).trim() };
        }
        return { speaker: profileA.name, text: line.trim() };
      });
      queueOverheardBubbles(state, bubbleLines);
      addNarrative(state, `You overhear ${profileA.name} and ${profileB.name} talking nearby...`, 'overheard');
    })
    .catch((err) => {
      state.overhearInProgress = false;
      console.error('[Overhear] Error:', err);
    });
}
