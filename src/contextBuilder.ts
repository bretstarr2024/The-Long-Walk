// ============================================================
// The Long Walk — Shared LLM Context Builders
// Single source of truth for buildGameContext + buildWalkerProfile
// Used by: ui.ts (chat), overhear.ts (narrator), approach.ts (NPC)
// ============================================================

import { GameState } from './types';
import { getWalkerData, getWalkerState, getWalkersRemaining } from './state';
import { type WalkerProfile, type GameContextForAgent } from './agentClient';

/**
 * Build the game context payload for LLM agent calls.
 *
 * @param state - Current game state
 * @param walkerNum - Walker number for walker-specific stats.
 *   If omitted, walker stats are zeroed (used by overhear narrator context).
 */
export function buildGameContext(state: GameState, walkerNum?: number): GameContextForAgent {
  // Walker-specific state (zeroed when no walker specified — e.g., narrator overhear)
  const w = walkerNum ? getWalkerState(state, walkerNum) : undefined;
  const walkerData = walkerNum ? getWalkerData(state, walkerNum) : undefined;

  // Recent events: walker-specific calls get filtered set, narrator gets raw slice
  const recentEvents = walkerNum
    ? state.narrativeLog
        .slice(-10)
        .filter(e => e.type === 'elimination' || e.type === 'event' || e.type === 'warning')
        .map(e => e.text)
    : state.narrativeLog.slice(-5).map(e => e.text);

  // Compute arc phase with two-pass fallback
  let arcPhase: string | undefined;
  let arcPromptHint: string | undefined;
  if (walkerData?.arcStages && w) {
    const mile = state.world.milesWalked;
    const convos = w.conversationCount;
    // Pass 1: find latest stage where mile AND conversations qualify
    for (let i = walkerData.arcStages.length - 1; i >= 0; i--) {
      const stage = walkerData.arcStages[i];
      if (mile >= stage.mileRange[0] && convos >= stage.minConversations) {
        arcPhase = stage.arcPhase;
        arcPromptHint = stage.promptHint;
        break;
      }
    }
    // Pass 2 (fallback): if no stage matched, use latest stage by mileRange only
    if (!arcPhase) {
      for (let i = walkerData.arcStages.length - 1; i >= 0; i--) {
        const stage = walkerData.arcStages[i];
        if (mile >= stage.mileRange[0]) {
          arcPhase = stage.arcPhase;
          arcPromptHint = stage.promptHint;
          break;
        }
      }
    }
  }

  return {
    milesWalked: state.world.milesWalked,
    hoursElapsed: state.world.hoursElapsed,
    currentTime: state.world.currentTime,
    dayNumber: state.world.dayNumber,
    isNight: state.world.isNight,
    weather: state.world.weather,
    terrain: state.world.terrain,
    crowdDensity: state.world.crowdDensity,
    crowdMood: state.world.crowdMood,
    currentAct: state.world.currentAct,
    horrorTier: state.world.horrorTier,
    walkersRemaining: getWalkersRemaining(state),
    playerName: state.player.name,
    playerWarnings: state.player.warnings,
    playerMorale: Math.round(state.player.morale),
    playerStamina: Math.round(state.player.stamina),
    walkerWarnings: w?.warnings ?? 0,
    walkerMorale: w ? Math.round(w.morale) : 0,
    walkerStamina: w ? Math.round(w.stamina) : 0,
    walkerRelationship: w?.relationship ?? 0,
    walkerBehavioralState: w?.behavioralState ?? 'steady',
    recentEvents,
    arcPhase,
    arcPromptHint,
    conversationCount: w?.conversationCount,
    revealedFacts: w && w.revealedFacts.length > 0 ? w.revealedFacts : undefined,
    playerActions: w && w.playerActions.length > 0 ? w.playerActions : undefined,
    isAllied: w?.isAlliedWithPlayer || undefined,
    isBonded: w?.isBonded || undefined,
    isEnemy: w?.isEnemy || undefined,
    allyStrain: w?.isAlliedWithPlayer ? w.allyStrain : undefined,
  };
}

/**
 * Build a walker profile for LLM agent calls.
 * Returns null if walker data is not found (safe for overhear).
 */
export function buildWalkerProfile(state: GameState, walkerNum: number): WalkerProfile | null {
  const d = getWalkerData(state, walkerNum);
  if (!d) return null;
  return {
    name: d.name,
    walkerNumber: d.walkerNumber,
    age: d.age,
    homeState: d.homeState,
    tier: d.tier,
    personalityTraits: d.personalityTraits,
    dialogueStyle: d.dialogueStyle,
    backstoryNotes: d.backstoryNotes,
    psychologicalArchetype: d.psychologicalArchetype,
    alliancePotential: d.alliancePotential,
  };
}
