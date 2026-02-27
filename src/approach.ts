// ============================================================
// The Long Walk — NPC Approach System
// NPCs proactively initiate conversations with the player
// ============================================================

import { GameState, ApproachType, WalkerState } from './types';
import { getWalkerData, getWalkerState, getAliveWalkers, addNarrative } from './state';
import { requestApproach, type WalkerProfile, type GameContextForAgent } from './agentClient';

// --- Config ---
function getMinMileGap(act: number): number {
  if (act === 1) return 5;
  if (act === 2) return 3;
  return 2; // Act 3-4
}

// Track last mile we checked to prevent multiple checks per mile
let lastApproachCheckMile = 0;

interface ApproachCandidate {
  walkerNum: number;
  type: ApproachType;
  priority: number;
  context: string; // description for LLM prompt
}

/**
 * Check if an NPC should approach the player this mile.
 * Called from the game loop. Sets state.activeApproach when triggered.
 */
export function checkApproach(state: GameState): void {
  // Preconditions
  if (!state.llmAvailable) return;
  if (state.player.activeCrisis) return;
  if (state.llmDialogue) return;
  if (state.activeScene) return;
  if (state.activeApproach) return;
  if (state.approachInProgress) return;

  // Only check once per mile
  const currentMile = Math.floor(state.world.milesWalked);
  if (currentMile <= lastApproachCheckMile) return;
  lastApproachCheckMile = currentMile;

  // Minimum gap between approaches
  const minGap = getMinMileGap(state.world.currentAct);
  if (state.world.milesWalked - state.lastApproachMile < minGap) return;

  // Build candidates by priority
  const candidates: ApproachCandidate[] = [];
  const aliveNearby = state.walkers.filter(w =>
    w.alive && w.position === state.player.position
  );

  for (const w of aliveNearby) {
    const data = getWalkerData(state, w.walkerNumber);
    if (!data || data.tier === 3) continue;

    // Arc milestone: walker has an arc stage that just became active
    if (data.arcStages) {
      const mile = state.world.milesWalked;
      for (const stage of data.arcStages) {
        if (mile >= stage.mileRange[0] && mile <= stage.mileRange[1] &&
            w.conversationCount >= stage.minConversations) {
          // Only trigger if we haven't had this specific approach yet
          const key = `arc_approach_${w.walkerNumber}_${stage.arcPhase}`;
          if (!state.triggeredEvents.has(key)) {
            candidates.push({
              walkerNum: w.walkerNumber,
              type: 'arc_milestone',
              priority: 10,
              context: `You're in your "${stage.arcPhase}" phase with ${state.player.name}. ${stage.promptHint}`,
            });
            break; // Only one arc milestone per walker
          }
        }
      }
    }

    // Elimination reaction: a Tier 1/2 walker died within last 5 miles
    const recentDeaths = state.walkers.filter(dw =>
      !dw.alive && dw.eliminatedAtMile !== null &&
      state.world.milesWalked - dw.eliminatedAtMile < 5
    );
    for (const dead of recentDeaths) {
      const deadData = getWalkerData(state, dead.walkerNumber);
      if (!deadData || deadData.tier === 3) continue;
      const reactionKey = `elim_reaction_${w.walkerNumber}_${dead.walkerNumber}`;
      if (!state.triggeredEvents.has(reactionKey) && w.relationship > 0) {
        candidates.push({
          walkerNum: w.walkerNumber,
          type: 'elimination_reaction',
          priority: 9,
          context: `${deadData.name} was just eliminated. React to their death. You ${w.relationship > 30 ? 'were close to ' + state.player.name : 'walked near them'}.`,
        });
      }
    }

    // Warning check: player got a warning within last 2 miles
    if (state.lastWarningMile > 0 && state.world.milesWalked - state.lastWarningMile < 2) {
      if (w.relationship > 10 && !state.triggeredEvents.has(`warn_check_${w.walkerNumber}_${Math.floor(state.lastWarningMile)}`)) {
        candidates.push({
          walkerNum: w.walkerNumber,
          type: 'warning_check',
          priority: 8,
          context: `${state.player.name} just got a warning. Check on them.`,
        });
      }
    }

    // Vulnerability: walker morale < 25, relationship > 30
    if (w.morale < 25 && w.relationship > 30) {
      const vulnKey = `vuln_${w.walkerNumber}_${Math.floor(state.world.milesWalked / 20)}`;
      if (!state.triggeredEvents.has(vulnKey)) {
        candidates.push({
          walkerNum: w.walkerNumber,
          type: 'vulnerability',
          priority: 7,
          context: `You're struggling emotionally. Your morale is very low. Reach out to ${state.player.name}.`,
        });
      }
    }

    // Offer alliance: relationship >= 55, no alliance yet, high potential
    if (w.relationship >= 55 && !w.isAlliedWithPlayer && data.alliancePotential === 'high') {
      const allyKey = `offer_ally_${w.walkerNumber}`;
      if (!state.triggeredEvents.has(allyKey)) {
        candidates.push({
          walkerNum: w.walkerNumber,
          type: 'offer_alliance',
          priority: 6,
          context: `You've grown close to ${state.player.name}. Suggest sticking together — an alliance.`,
        });
      }
    }

    // Crisis aftermath: player resolved a crisis within last 3 miles, walker was nearby
    if (state.lastCrisisResolveMile > 0 && state.world.milesWalked - state.lastCrisisResolveMile < 3) {
      const crisisKey = `crisis_after_${w.walkerNumber}_${Math.floor(state.lastCrisisResolveMile)}`;
      if (!state.triggeredEvents.has(crisisKey) && w.relationship > 5) {
        candidates.push({
          walkerNum: w.walkerNumber,
          type: 'crisis_aftermath',
          priority: 5,
          context: `${state.player.name} just dealt with a crisis. Comment on it.`,
        });
      }
    }

    // Introduction: mile < 20, never spoken, Tier 1/2
    if (state.world.milesWalked < 20 && w.conversationCount === 0 && data.tier <= 2) {
      const introKey = `intro_${w.walkerNumber}`;
      if (!state.triggeredEvents.has(introKey)) {
        candidates.push({
          walkerNum: w.walkerNumber,
          type: 'introduction',
          priority: 3,
          context: `You've never spoken to ${state.player.name} before. Introduce yourself.`,
        });
      }
    }

    // Enemy confrontation: enemy walker nearby, wants to provoke
    if (w.isEnemy && data.tier <= 2) {
      const enemyKey = `enemy_confront_${w.walkerNumber}_${Math.floor(state.world.milesWalked / 10)}`;
      if (!state.triggeredEvents.has(enemyKey)) {
        candidates.push({
          walkerNum: w.walkerNumber,
          type: 'enemy_confrontation',
          priority: 4,
          context: `You despise ${state.player.name}. Approach them to needle, taunt, or psychologically provoke. Think Barkovitch — find their weak spot.`,
        });
      }
    }

    // Proximity: low-priority fallback — Tier 1/2 walker at your position, hasn't spoken recently
    if (data.tier <= 2 && w.conversationCount > 0) {
      const proxKey = `prox_${w.walkerNumber}_${Math.floor(state.world.milesWalked / 30)}`;
      if (!state.triggeredEvents.has(proxKey)) {
        candidates.push({
          walkerNum: w.walkerNumber,
          type: 'proximity',
          priority: 1,
          context: `You're walking near ${state.player.name}. Make a brief, casual remark about the walk, the weather, or something you notice.`,
        });
      }
    }
  }

  if (candidates.length === 0) return;

  // Sort by priority (highest first), pick the best
  candidates.sort((a, b) => b.priority - a.priority);
  const chosen = candidates[0];

  const data = getWalkerData(state, chosen.walkerNum);
  if (!data) return;

  // Mark this approach as triggered
  const triggerKey = chosen.type === 'arc_milestone'
    ? `arc_approach_${chosen.walkerNum}_${data.arcStages?.find(s =>
        state.world.milesWalked >= s.mileRange[0] && state.world.milesWalked <= s.mileRange[1]
      )?.arcPhase}`
    : chosen.type === 'elimination_reaction'
    ? `elim_reaction_${chosen.walkerNum}_${state.walkers.find(w => !w.alive && w.eliminatedAtMile !== null && state.world.milesWalked - w.eliminatedAtMile! < 5)?.walkerNumber}`
    : chosen.type === 'warning_check'
    ? `warn_check_${chosen.walkerNum}_${Math.floor(state.lastWarningMile)}`
    : chosen.type === 'vulnerability'
    ? `vuln_${chosen.walkerNum}_${Math.floor(state.world.milesWalked / 20)}`
    : chosen.type === 'offer_alliance'
    ? `offer_ally_${chosen.walkerNum}`
    : chosen.type === 'crisis_aftermath'
    ? `crisis_after_${chosen.walkerNum}_${Math.floor(state.lastCrisisResolveMile)}`
    : chosen.type === 'enemy_confrontation'
    ? `enemy_confront_${chosen.walkerNum}_${Math.floor(state.world.milesWalked / 10)}`
    : chosen.type === 'proximity'
    ? `prox_${chosen.walkerNum}_${Math.floor(state.world.milesWalked / 30)}`
    : `intro_${chosen.walkerNum}`;

  state.triggeredEvents.add(triggerKey);
  state.lastApproachMile = state.world.milesWalked;
  state.approachInProgress = true;

  // Set up approach state with streaming placeholder
  state.activeApproach = {
    walkerId: chosen.walkerNum,
    walkerName: data.name,
    type: chosen.type,
    text: '',
    isStreaming: true,
    streamBuffer: '',
    startTime: Date.now(),
  };

  // Build walker profile and game context for LLM
  const w = getWalkerState(state, chosen.walkerNum)!;
  const profile: WalkerProfile = {
    name: data.name,
    walkerNumber: data.walkerNumber,
    age: data.age,
    homeState: data.homeState,
    tier: data.tier,
    personalityTraits: data.personalityTraits,
    dialogueStyle: data.dialogueStyle,
    backstoryNotes: data.backstoryNotes,
    psychologicalArchetype: data.psychologicalArchetype,
    alliancePotential: data.alliancePotential,
  };

  const remaining = getAliveWalkers(state).length + 1;
  const recentEvents = state.narrativeLog.slice(-5).map(e => e.text);

  // Compute arc phase
  let arcPhase: string | undefined;
  let arcPromptHint: string | undefined;
  if (data.arcStages) {
    for (let i = data.arcStages.length - 1; i >= 0; i--) {
      const stage = data.arcStages[i];
      if (state.world.milesWalked >= stage.mileRange[0] && w.conversationCount >= stage.minConversations) {
        arcPhase = stage.arcPhase;
        arcPromptHint = stage.promptHint;
        break;
      }
    }
  }

  const gameCtx: GameContextForAgent = {
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
    walkersRemaining: remaining,
    playerName: state.player.name,
    playerWarnings: state.player.warnings,
    playerMorale: Math.round(state.player.morale),
    playerStamina: Math.round(state.player.stamina),
    walkerWarnings: w.warnings,
    walkerMorale: Math.round(w.morale),
    walkerStamina: Math.round(w.stamina),
    walkerRelationship: w.relationship,
    walkerBehavioralState: w.behavioralState,
    recentEvents,
    arcPhase,
    arcPromptHint,
    conversationCount: w.conversationCount,
    revealedFacts: w.revealedFacts.length > 0 ? w.revealedFacts : undefined,
    playerActions: w.playerActions.length > 0 ? w.playerActions : undefined,
    isAllied: w.isAlliedWithPlayer || undefined,
    isBonded: w.isBonded || undefined,
    isEnemy: w.isEnemy || undefined,
    allyStrain: w.isAlliedWithPlayer ? w.allyStrain : undefined,
  };

  // Fire LLM request
  requestApproach(profile, gameCtx, chosen.type, chosen.context)
    .then((result) => {
      state.approachInProgress = false;
      if (result.error || !result.text) {
        console.log('[Approach] LLM approach failed:', result.error);
        state.activeApproach = null;
        return;
      }
      if (state.activeApproach && state.activeApproach.walkerId === chosen.walkerNum) {
        state.activeApproach.text = result.text;
        state.activeApproach.isStreaming = false;
      }
    })
    .catch((err) => {
      state.approachInProgress = false;
      state.activeApproach = null;
      console.error('[Approach] Error:', err);
    });
}
