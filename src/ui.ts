// ============================================================
// The Long Walk — UI Renderer (Event Delegation + Cached Updates)
// ============================================================

import { GameState, PlayerState, WalkerState, PackPosition, Reason } from './types';
import { getNearbyWalkers, getWalkerData, getWalkerState, getWalkersRemaining, getRelationshipTier, addNarrative } from './state';
import { setPlayerSpeed, setPlayerEffort, setPlayerPosition, requestFood, requestWater, shareFood, shareWater, playerPee, playerPoop, formAlliance, breakAlliance, formBond } from './engine';
import { startDialogue, selectDialogueOption, closeDialogue } from './dialogue';
import { getEndingText, getGameStats, EndingType } from './narrative';
import { getRouteSegment } from './data/route';
import { initVisualization, updateVisualization } from './visualization';
import { sendMessage, isServerAvailable, type WalkerProfile, type GameContextForAgent } from './agentClient';
import { toggleMute, getIsMuted } from './audio';
import { resolveCrisis } from './crises';

let app: HTMLElement;
let currentRenderedScreen: string = '';
let gameState: GameState | null = null;

// --- Social action icons (inline SVG, 14px) ---
const ICON = {
  food: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="3" y="5" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 5V3.5a3 3 0 016 0V5" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>',
  water: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2.5C6.5 5.5 4 8 4 10.5a4 4 0 008 0C12 8 9.5 5.5 8 2.5z" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>',
  story: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" stroke-width="1.3"/><line x1="5.5" y1="5" x2="10.5" y2="5" stroke="currentColor" stroke-width="0.9"/><line x1="5.5" y1="7.5" x2="10.5" y2="7.5" stroke="currentColor" stroke-width="0.9"/><line x1="5.5" y1="10" x2="8.5" y2="10" stroke="currentColor" stroke-width="0.9"/></svg>',
  encourage: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2.5l1.8 3.6 4 .6-2.9 2.8.7 4L8 11.5l-3.6 2-.7-4-2.9-2.8 4-.6z" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>',
  walk: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="5.5" cy="3.5" r="1.5" stroke="currentColor" stroke-width="1.1"/><path d="M5.5 5.5v4l-1.5 3.5" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 7.5l2 2" stroke="currentColor" stroke-width="1.3"/><circle cx="10.5" cy="3.5" r="1.5" stroke="currentColor" stroke-width="1.1"/><path d="M10.5 5.5v4l1.5 3.5" stroke="currentColor" stroke-width="1.3"/><path d="M10.5 7.5l-2 2" stroke="currentColor" stroke-width="1.3"/></svg>',
  alliance: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 10l3-3 2.5 2.5L12 6" stroke="currentColor" stroke-width="1.3"/><path d="M9.5 6H12v2.5" stroke="currentColor" stroke-width="1.3"/></svg>',
  bond: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 4.5C7 3 5 2.5 3.8 3.8 2.5 5 2.8 7 8 11.5c5.2-4.5 5.5-6.5 4.2-7.7C11 2.5 9 3 8 4.5z" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>',
  breakIt: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><line x1="4" y1="4" x2="12" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="4" x2="4" y2="12" stroke="currentColor" stroke-width="1.5"/></svg>',
  talk: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 11v2.5L8 11" stroke="currentColor" stroke-width="1.3"/></svg>',
  think: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="4" stroke="currentColor" stroke-width="1.3"/><path d="M6 10.5c0 1.5 1 2.5 2 2.5s2-1 2-2.5" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="5.5" r="0.8" fill="currentColor"/><circle cx="9.5" cy="5.5" r="0.8" fill="currentColor"/></svg>',
  observe: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/></svg>',
};

// HTML entity escaping — prevents XSS from LLM/user text reaching innerHTML
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Track narrative entries we've already rendered
let renderedNarrativeCount = 0;

// Cache panel HTML to prevent unnecessary DOM rebuilds (fixes blinking)
let cachedWalkersHtml = '';
let cachedActionsHtml = '';
let cachedControlsHtml = '';
let cachedDialogueHtml = '';
let cachedCrisisHtml = '';
let cachedSceneHtml = '';
let cachedApproachHtml = '';
let cachedWarningHtml = '';
let walkerPickerOpen = false;

// ============================================================
// INIT — sets up app ref + event delegation (once)
// ============================================================

export function initUI() {
  app = document.getElementById('app')!;
  setupEventDelegation();
  console.log('[UI] Initialized with event delegation');
}

// ============================================================
// EVENT DELEGATION — single handler, never destroyed
// ============================================================

function setupEventDelegation() {
  app.addEventListener('click', (e: MouseEvent) => {
    if (!gameState) return;
    const target = e.target as HTMLElement;

    const actionEl = target.closest('[data-action]') as HTMLElement;
    if (actionEl) {
      e.preventDefault();
      const action = actionEl.dataset.action!;
      console.log('[UI] Action:', action);
      handleAction(action, gameState);
      return;
    }

    const walkerEl = target.closest('[data-walker]') as HTMLElement;
    if (walkerEl) {
      const num = parseInt(walkerEl.dataset.walker!);
      console.log('[UI] Walker click:', num);
      handleWalkerClick(gameState, num);
      return;
    }

    const pickEl = target.closest('[data-pick-walker]') as HTMLElement;
    if (pickEl) {
      const num = parseInt(pickEl.dataset.pickWalker!);
      console.log('[UI] Walker picked:', num);
      walkerPickerOpen = false;
      cachedActionsHtml = '';
      handleWalkerPicked(gameState, num);
      return;
    }

    const crisisEl = target.closest('[data-crisis-option]') as HTMLElement;
    if (crisisEl) {
      const optionId = crisisEl.dataset.crisisOption!;
      console.log('[UI] Crisis option:', optionId);
      handleCrisisOption(gameState, optionId);
      return;
    }

    const optionEl = target.closest('[data-option]') as HTMLElement;
    if (optionEl) {
      const idx = parseInt(optionEl.dataset.option!);
      console.log('[UI] Dialogue option:', idx);
      if (idx === -1) closeDialogue(gameState);
      else selectDialogueOption(gameState, idx);
      return;
    }
  });

  app.addEventListener('input', (e: Event) => {
    if (!gameState) return;
    const target = e.target as HTMLInputElement;
    if (target.id === 'effort-slider') {
      setPlayerEffort(gameState, parseInt(target.value));
    }
  });

  // Keyboard shortcuts within game UI (Escape handled in main.ts to avoid duplicate cascade)
  app.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!gameState) return;
    const target = e.target as HTMLElement;
    if (target.id === 'llm-chat-input' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat(gameState);
    }
  });
}

function handleAction(action: string, state: GameState) {
  switch (action) {
    case 'start': state.screen = 'creation'; currentRenderedScreen = ''; break;
    case 'intro-next': advanceIntro(state); break;
    case 'restart': window.location.reload(); break;
    case 'effort-down': setPlayerEffort(state, state.player.effort - 5); break;
    case 'effort-up': setPlayerEffort(state, state.player.effort + 5); break;
    case 'pos-front': changePosition(state, 'front'); break;
    case 'pos-middle': changePosition(state, 'middle'); break;
    case 'pos-back': changePosition(state, 'back'); break;
    case 'food': requestFood(state); break;
    case 'water': requestWater(state); break;
    case 'talk': handleTalk(state); break;
    case 'send-chat': handleSendChat(state); break;
    case 'close-chat': closeLLMDialogue(state); break;
    case 'observe': handleObserve(state); break;
    case 'think': handleThink(state); break;
    case 'pause': state.isPaused = !state.isPaused; break;
    case 'toggle-pause-chat':
      state.isPaused = !state.isPaused;
      if (state.isPaused) { pausedFromChat = true; } else { pausedFromChat = false; }
      break;
    case 'mute': toggleMute(); cachedControlsHtml = ''; break;
    case 'speed-1': state.gameSpeed = 1; break;
    case 'speed-2': state.gameSpeed = 2; break;
    case 'speed-4': state.gameSpeed = 4; break;
    case 'speed-8': state.gameSpeed = 8; break;
    case 'share-food': handleShareFood(state); break;
    case 'share-water': handleShareWater(state); break;
    case 'pee': playerPee(state); break;
    case 'poop': playerPoop(state); break;
    case 'scene-next': handleSceneNext(state); break;
    case 'scene-close': handleSceneClose(state); break;
    case 'approach-reply': handleApproachReply(state); break;
    case 'approach-nod': handleApproachNod(state); break;
    case 'approach-ignore': handleApproachIgnore(state); break;
    case 'dossier-talk': handleDossierTalk(state); break;
    case 'dossier-close': activeDossierWalker = null; cachedActionsHtml = ''; break;
    // Social actions (from chat card)
    case 'chat-share-food': handleChatShareFood(state); break;
    case 'chat-share-water': handleChatShareWater(state); break;
    case 'chat-tell-story': handleChatTellStory(state); break;
    case 'chat-encourage': handleChatEncourage(state); break;
    case 'chat-walk-together': handleChatWalkTogether(state); break;
    // Hostile actions (from chat card, enemy only)
    case 'hostile-taunt': handleHostileAction(state, 'verbal_taunt'); break;
    case 'hostile-lullaby': handleHostileAction(state, 'lullaby'); break;
    case 'hostile-isolation': handleHostileAction(state, 'isolation'); break;
    case 'hostile-pace': handleHostileAction(state, 'pace_pressure'); break;
    case 'hostile-crowd': handleHostileAction(state, 'crowd_turn'); break;
    case 'hostile-trip': handleHostileAction(state, 'trip'); break;
    case 'hostile-steal': handleHostileAction(state, 'steal_supplies'); break;
    // Alliance actions (from chat card)
    case 'propose-alliance': handleProposeAlliance(state); break;
    case 'propose-bond': handleProposeBond(state); break;
    case 'break-alliance': handleBreakAlliance(state); break;
  }
}

function handleCrisisOption(state: GameState, optionId: string) {
  if (!state.player.activeCrisis) return;
  resolveCrisis(state, optionId);
  cachedCrisisHtml = '';
  cachedActionsHtml = '';
  // Clear DOM immediately (same pattern as handleSceneClose)
  const container = document.getElementById('crisis-container');
  if (container) container.innerHTML = '';
}

function handleShareFood(state: GameState) {
  shareFood(state);
  cachedActionsHtml = '';
}

function handleShareWater(state: GameState) {
  shareWater(state);
  cachedActionsHtml = '';
}

// --- Chat Card Social Actions ---

function getChatWalker(state: GameState): WalkerState | undefined {
  if (!state.llmDialogue) return undefined;
  return getWalkerState(state, state.llmDialogue!.walkerId);
}

function handleChatShareFood(state: GameState) {
  const w = getChatWalker(state);
  if (!w || !w.alive || state.player.foodCooldown > 0) return;
  state.player.foodCooldown = 30;
  w.stamina = Math.min(100, w.stamina + 8);
  w.morale = Math.min(100, w.morale + 5);
  w.relationship = Math.min(100, w.relationship + 10);
  state.player.morale = Math.min(100, state.player.morale + 5);
  const data = getWalkerData(state, w.walkerNumber);
  const name = data?.name || `Walker #${w.walkerNumber}`;
  addNarrative(state, `You hand your food concentrate to ${name}. They eat it without a word. You won't eat for thirty minutes.`, 'narration');
  w.playerActions.push(`Shared food at mile ${Math.round(state.world.milesWalked)}`);
  cachedSocialActionsHtml = '';
}

function handleChatShareWater(state: GameState) {
  const w = getChatWalker(state);
  if (!w || !w.alive || state.player.waterCooldown > 0) return;
  state.player.waterCooldown = 15;
  w.stamina = Math.min(100, w.stamina + 5);
  w.morale = Math.min(100, w.morale + 3);
  w.relationship = Math.min(100, w.relationship + 8);
  state.player.morale = Math.min(100, state.player.morale + 3);
  const data = getWalkerData(state, w.walkerNumber);
  const name = data?.name || `Walker #${w.walkerNumber}`;
  addNarrative(state, `You pass your canteen to ${name}. They drink deep. You'll go without for fifteen minutes.`, 'narration');
  w.playerActions.push(`Shared water at mile ${Math.round(state.world.milesWalked)}`);
  cachedSocialActionsHtml = '';
}

function handleChatTellStory(state: GameState) {
  const w = getChatWalker(state);
  if (!w || !w.alive) return;
  if (w.relationship < 10) return;
  if (state.world.milesWalked - w.lastStoryMile < 10) return;
  w.lastStoryMile = state.world.milesWalked;
  w.morale = Math.min(100, w.morale + 5);
  w.relationship = Math.min(100, w.relationship + 3);
  state.player.morale = Math.min(100, state.player.morale + 3);
  const data = getWalkerData(state, w.walkerNumber);
  const name = data?.name || `Walker #${w.walkerNumber}`;
  const stories = [
    `You tell ${name} about your life back home. For a moment, the road feels shorter.`,
    `You share a memory — something funny from school. ${name} actually laughs.`,
    `You talk about ${state.player.prize}. ${name} listens carefully. They understand.`,
    `You tell ${name} a story your father used to tell. The words come easy for once.`,
  ];
  addNarrative(state, stories[Math.floor(Math.random() * stories.length)], 'narration');
  w.playerActions.push(`Told a story at mile ${Math.round(state.world.milesWalked)}`);
  cachedSocialActionsHtml = '';
}

function handleChatEncourage(state: GameState) {
  const w = getChatWalker(state);
  if (!w || !w.alive) return;
  if (state.world.milesWalked - w.lastEncourageMile < 5) return;
  w.lastEncourageMile = state.world.milesWalked;
  w.morale = Math.min(100, w.morale + 3);
  state.player.morale = Math.min(100, state.player.morale + 1);
  const data = getWalkerData(state, w.walkerNumber);
  const name = data?.name || `Walker #${w.walkerNumber}`;
  const encouragements = [
    `"Keep going." ${name} nods. Sometimes that's enough.`,
    `"You've got this." ${name} doesn't respond, but their step steadies.`,
    `"One foot in front of the other." ${name} manages a thin smile.`,
  ];
  addNarrative(state, encouragements[Math.floor(Math.random() * encouragements.length)], 'narration');
  cachedSocialActionsHtml = '';
}

function handleChatWalkTogether(state: GameState) {
  const w = getChatWalker(state);
  if (!w || !w.alive) return;
  if (w.relationship < 30 || w.position !== state.player.position) return;
  w.walkingTogether = !w.walkingTogether;
  const data = getWalkerData(state, w.walkerNumber);
  const name = data?.name || `Walker #${w.walkerNumber}`;
  if (w.walkingTogether) {
    addNarrative(state, `You fall into step beside ${name}. Walking together.`, 'narration');
  } else {
    addNarrative(state, `You drift apart from ${name}. Back to walking alone.`, 'narration');
  }
  cachedSocialActionsHtml = '';
}

// --- Hostile Actions (Player → Enemy NPC) ---

function handleHostileAction(state: GameState, actionType: import('./types').PlayerHostileActionType) {
  const w = getChatWalker(state);
  if (!w || !w.alive || !w.isEnemy) return;
  const data = getWalkerData(state, w.walkerNumber);
  const name = data?.name || `Walker #${w.walkerNumber}`;
  const p = state.player;

  switch (actionType) {
    case 'verbal_taunt':
      w.morale = Math.max(0, w.morale - 8);
      if (w.relationship > -60) w.relationship = Math.max(-100, w.relationship - 5);
      addNarrative(state, `You mock ${name}. The words are sharp. Ugly. They land.`, 'narration');
      break;

    case 'lullaby':
      w.clarity = Math.max(0, w.clarity - 10);
      addNarrative(state, `You speak low and slow to ${name}. Soothing. Rhythmic. Their eyes get heavy.`, 'narration');
      break;

    case 'isolation':
      if (p.alliances.length === 0) {
        addNarrative(state, `You have no allies to turn against them.`, 'thought');
        return;
      }
      w.morale = Math.max(0, w.morale - 10);
      addNarrative(state, `You and your allies close ranks. ${name} is on the outside now.`, 'narration');
      break;

    case 'pace_pressure':
      w.stamina = Math.max(0, w.stamina - 5);
      p.effort = Math.min(100, p.effort + 10);
      p.tempEffects.push({ type: 'speed_override', value: 5.5, remaining: 2 });
      addNarrative(state, `You speed up, forcing ${name} to match. It costs you both.`, 'narration');
      break;

    case 'crowd_turn':
      w.morale = Math.max(0, w.morale - 5);
      addNarrative(state, `You make sure the others see what ${name} really is. The pack shifts.`, 'narration');
      break;

    case 'trip': {
      if (w.warnings >= 2) {
        addNarrative(state, `${name} has two warnings. You won't be the one to end it. Not like that.`, 'thought');
        return;
      }
      w.warnings++;
      w.speed = Math.min(w.speed, 3.5);
      w.warningTimer = 0; // Prevent NPC warning system from cascading to 3rd warning
      addNarrative(state, `"Warning! ${w.warnings === 1 ? 'Warning' : 'Second warning,'} ${w.walkerNumber}!"`, 'warning');
      // Player risks warning (60% chance)
      if (Math.random() < 0.6 && p.warnings < 2) {
        p.warnings++;
        p.lastWarningTime = state.world.hoursElapsed;
        p.slowAccum = 0;
        state.lastWarningMile = state.world.milesWalked;
        addNarrative(state, `The soldier sees you too. "Warning! ${p.warnings === 1 ? 'Warning' : 'Second warning,'} ${p.walkerNumber}!"`, 'warning');
        addNarrative(state, `Your foot catches ${name}'s ankle. They stumble. So do you.`, 'narration');
      } else {
        addNarrative(state, `Your foot catches ${name}'s ankle. They stumble. You keep walking.`, 'narration');
      }
      break;
    }

    case 'steal_supplies': {
      if (w.warnings >= 2) {
        addNarrative(state, `${name} has two warnings already. Too risky.`, 'thought');
        return;
      }
      p.hydration = Math.min(100, p.hydration + 20);
      w.warnings++;
      w.warningTimer = 0; // Prevent NPC warning system from cascading to 3rd warning
      addNarrative(state, `"Warning! ${w.warnings === 1 ? 'Warning' : 'Second warning,'} ${w.walkerNumber}!"`, 'warning');
      if (Math.random() < 0.4 && p.warnings < 2) {
        p.warnings++;
        p.lastWarningTime = state.world.hoursElapsed;
        p.slowAccum = 0;
        state.lastWarningMile = state.world.milesWalked;
        addNarrative(state, `"Warning! ${p.warnings === 1 ? 'Warning' : 'Second warning,'} ${p.walkerNumber}!"`, 'warning');
        addNarrative(state, `You grab from ${name}'s belt. They lunge. The soldiers see both of you.`, 'narration');
      } else {
        addNarrative(state, `You grab from ${name}'s belt. They're too slow to stop you.`, 'narration');
      }
      break;
    }
  }
  cachedSocialActionsHtml = '';
}

// --- Alliance Actions (from chat card) ---

function handleProposeAlliance(state: GameState) {
  const w = getChatWalker(state);
  if (!w || !w.alive || w.isAlliedWithPlayer || w.isEnemy) return;
  if (state.player.alliances.length >= 2) return;

  const data = getWalkerData(state, w.walkerNumber);
  const name = data?.name || `Walker #${w.walkerNumber}`;

  if (w.relationship < 50) {
    // Too soon — refused with relationship penalty
    w.relationship = Math.max(-100, w.relationship - 15);
    addNarrative(state, `You ask ${name} to walk together. An alliance. They look away. "I don't think so. Not yet." The rejection stings.`, 'narration');
  } else if (w.relationship < 60 && Math.random() < 0.5) {
    // Borderline — 50% chance refused
    w.relationship = Math.max(-100, w.relationship - 5);
    addNarrative(state, `You propose an alliance to ${name}. They hesitate. "Maybe later." It wasn't a no, but it wasn't a yes.`, 'narration');
  } else {
    // Accepted
    formAlliance(state, w.walkerNumber);
  }
  cachedSocialActionsHtml = '';
}

function handleProposeBond(state: GameState) {
  const w = getChatWalker(state);
  if (!w || !w.alive || !w.isAlliedWithPlayer || w.isBonded) return;
  if (state.player.bondedAlly !== null) return;

  formBond(state, w.walkerNumber);
  cachedSocialActionsHtml = '';
}

function handleBreakAlliance(state: GameState) {
  const w = getChatWalker(state);
  if (!w || !w.isAlliedWithPlayer || w.isBonded) return;

  breakAlliance(state, w.walkerNumber);
  cachedSocialActionsHtml = '';
}

function changePosition(state: GameState, pos: PackPosition) {
  if (state.player.position === pos) return;
  const prev = state.player.position;
  setPlayerPosition(state, pos);
  walkerPickerOpen = false;
  cachedWalkersHtml = '';
  cachedActionsHtml = '';
  const labels: Record<string, string> = {
    front: 'front of the pack',
    middle: 'middle of the pack',
    back: 'back of the pack',
  };
  addNarrative(state, `You drift from the ${labels[prev]} to the ${labels[pos]}.`, 'narration');
}

function handleTalk(state: GameState) {
  if (state.llmDialogue) return;

  // Toggle walker picker
  walkerPickerOpen = !walkerPickerOpen;
  cachedActionsHtml = ''; // force re-render
}

function handleWalkerPicked(state: GameState, walkerNumber: number) {
  const w = getWalkerState(state, walkerNumber);
  if (!w || !w.alive) return;

  const data = getWalkerData(state, walkerNumber);
  if (!data) return;

  // Tier 1/2 + server online → LLM chat
  if (state.llmAvailable && data.tier <= 2) {
    // Close existing chat if open (switching to new walker)
    if (state.llmDialogue) {
      state.llmDialogue = null;
    }
    state.llmDialogue = {
      walkerId: walkerNumber,
      walkerName: data.name,
      messages: [],
      isStreaming: false,
      streamBuffer: '',
    };
    console.log('[Talk] LLM chat opened with', data.name, '#' + walkerNumber);
    return;
  }

  // Tier 1/2 server offline → can't talk
  if (data.tier <= 2 && !state.llmAvailable) {
    addNarrative(state, `You try to catch ${data.name}'s attention, but they don't seem to hear you over the wind.`, 'narration');
    return;
  }

  // Tier 3 → they're background, brief non-dialogue narration
  const dismissals = [
    `${data.name} glances at you but keeps walking.`,
    `${data.name} nods once and looks away.`,
    `${data.name} doesn't seem interested in talking.`,
    `You fall into step beside ${data.name}, but neither of you speaks.`,
  ];
  addNarrative(state, dismissals[Math.floor(Math.random() * dismissals.length)], 'narration');
}

export function closeWalkerPicker() {
  if (walkerPickerOpen) {
    walkerPickerOpen = false;
    cachedActionsHtml = '';
  }
}

export function closeLLMDialogue(state: GameState) {
  if (!state.llmDialogue) return;
  const dlg = state.llmDialogue;
  // Increment conversation count if at least one exchange happened
  if (dlg.messages.length >= 2) {
    const w = getWalkerState(state, dlg.walkerId);
    if (w) w.conversationCount++;
  }
  const name = dlg.walkerName;
  state.llmDialogue = null;
  addNarrative(state, `You stop talking to ${name} and focus on walking.`, 'narration');
  // Auto-resume if game was paused via "Stop the World" button
  if (pausedFromChat && !state.activeScene) {
    state.isPaused = false;
    pausedFromChat = false;
  }
}

function buildGameContext(state: GameState, walkerNum: number): GameContextForAgent {
  const w = getWalkerState(state, walkerNum)!;
  const remaining = getWalkersRemaining(state);
  const recentEvents = state.narrativeLog
    .slice(-10)
    .filter(e => e.type === 'elimination' || e.type === 'event' || e.type === 'warning')
    .map(e => e.text);

  // Compute arc phase for this walker
  const walkerData = getWalkerData(state, walkerNum);
  let arcPhase: string | undefined;
  let arcPromptHint: string | undefined;
  if (walkerData?.arcStages) {
    const mile = state.world.milesWalked;
    const convos = w.conversationCount;
    // Find the latest arc stage the walker qualifies for (mile + conversations)
    for (let i = walkerData.arcStages.length - 1; i >= 0; i--) {
      const stage = walkerData.arcStages[i];
      if (mile >= stage.mileRange[0] && convos >= stage.minConversations) {
        arcPhase = stage.arcPhase;
        arcPromptHint = stage.promptHint;
        break;
      }
    }
    // Fallback: if no stage matched (mile advanced past range but convos insufficient),
    // use the latest stage whose mile range the walker has entered
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
    // Arc context
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
}

function buildWalkerProfile(state: GameState, walkerNum: number): WalkerProfile {
  const d = getWalkerData(state, walkerNum)!;
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

async function handleSendChat(state: GameState) {
  if (!state.llmDialogue || state.llmDialogue.isStreaming) return;

  const input = document.getElementById('llm-chat-input') as HTMLInputElement;
  if (!input) return;

  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  const dlg = state.llmDialogue;

  // Add player message
  dlg.messages.push({ role: 'player', text: message });
  dlg.isStreaming = true;
  dlg.streamBuffer = '';

  const walkerProfile = buildWalkerProfile(state, dlg.walkerId);
  const gameCtx = buildGameContext(state, dlg.walkerId);

  try {
    for await (const event of sendMessage(dlg.walkerId, message, walkerProfile, gameCtx)) {
      if (!state.llmDialogue) break; // Chat was closed during streaming

      switch (event.type) {
        case 'token':
          dlg.streamBuffer += event.text;
          // Streaming text is updated by updateLLMChatOverlay on next render tick
          break;

        case 'effect':
          applyGameEffect(state, event);
          break;

        case 'done':
          dlg.messages.push({ role: 'walker', text: dlg.streamBuffer || event.text });
          dlg.streamBuffer = '';
          dlg.isStreaming = false;
          // Add to narrative log
          addNarrative(state, `${dlg.walkerName}: ${event.text}`, 'dialogue');
          break;

        case 'error':
          dlg.isStreaming = false;
          dlg.messages.push({ role: 'walker', text: `[Connection lost: ${event.error}]` });
          break;
      }
    }

    // Safety reset: if stream ended without a done/error event, finalize
    if (state.llmDialogue && dlg.isStreaming) {
      if (dlg.streamBuffer) {
        dlg.messages.push({ role: 'walker', text: dlg.streamBuffer });
        dlg.streamBuffer = '';
      }
      dlg.isStreaming = false;
    }
  } catch (err: any) {
    if (state.llmDialogue) {
      dlg.isStreaming = false;
      dlg.messages.push({ role: 'walker', text: `[Error: ${err.message || 'Connection failed'}]` });
    }
  }

  // Refocus input so the player can keep typing
  const inp = document.getElementById('llm-chat-input') as HTMLInputElement;
  if (inp) inp.focus();
}

function applyGameEffect(state: GameState, effect: { effectType: string; walkerId?: number; delta?: number; key?: string; value?: boolean; text?: string }) {
  const w = state.llmDialogue ? getWalkerState(state, state.llmDialogue!.walkerId) ?? null : null;

  switch (effect.effectType) {
    case 'relationship':
      if (w && effect.delta) {
        w.relationship = Math.max(-100, Math.min(100, w.relationship + effect.delta));
        console.log(`[Effect] Relationship ${effect.delta > 0 ? '+' : ''}${effect.delta} → ${w.relationship}`);
        // Relationship improvement → morale/stamina bonuses
        if (effect.delta > 0) {
          const moraleBump = effect.delta * 2;
          state.player.morale = Math.min(100, state.player.morale + moraleBump);
          w.morale = Math.min(100, w.morale + moraleBump);
          if (effect.delta >= 5) {
            state.player.stamina = Math.min(100, state.player.stamina + 1);
          }
        } else {
          // Relationship worsening → morale drain (player only)
          state.player.morale = Math.max(0, state.player.morale + effect.delta);
        }
      }
      break;
    case 'morale':
      if (effect.delta) {
        state.player.morale = Math.max(0, Math.min(100, state.player.morale + effect.delta));
        console.log(`[Effect] Morale ${effect.delta > 0 ? '+' : ''}${effect.delta} → ${state.player.morale}`);
      }
      break;
    case 'flag':
      if (effect.key && w) {
        w.conversationFlags[effect.key] = effect.value ?? true;
        console.log(`[Effect] Flag "${effect.key}" = ${effect.value} on walker #${w.walkerNumber}`);
      }
      break;
    case 'info':
      if (effect.text) {
        addNarrative(state, effect.text, 'narration');
        // Track revealed facts on the walker
        if (w) {
          w.revealedFacts.push(effect.text);
          // Cap at 20 facts
          if (w.revealedFacts.length > 20) w.revealedFacts = w.revealedFacts.slice(-20);
        }
        console.log(`[Effect] Info shared: ${effect.text}`);
      }
      break;
  }
}

function handleObserve(state: GameState) {
  const seg = getRouteSegment(state.world.milesWalked);
  addNarrative(state, seg.notes, 'narration');
  const alive = state.walkers.filter(w => w.alive);
  const struggling = alive.filter(w => w.behavioralState === 'struggling' || w.behavioralState === 'breaking_down');
  if (struggling.length > 0) {
    const s = struggling[0];
    const d = getWalkerData(state, s.walkerNumber);
    if (d) addNarrative(state, `${d.name} (#${s.walkerNumber}) looks like they're struggling.`, 'narration');
  }
}

function handleThink(state: GameState) {
  const mile = state.world.milesWalked;
  if ((mile - state.player.lastThinkMile) < 5) return;

  state.player.lastThinkMile = mile;
  const prize = state.player.prize;
  const thoughts = [
    `${prize}. That's why you're here. That's why you keep walking.`,
    `You think about ${prize}. The image is clear for a moment, then blurs. Keep walking.`,
    `${prize}. Is it worth this? It has to be. It has to be.`,
    `Remember: ${prize}. That's the reason. Don't lose the reason.`,
  ];
  addNarrative(state, thoughts[Math.floor(Math.random() * thoughts.length)], 'thought');
  const boost = Math.max(1, 5 - Math.floor(mile / 80));
  state.player.morale = Math.min(100, state.player.morale + boost);
}

// --- Walker Dossier ---
let activeDossierWalker: number | null = null;

function handleWalkerClick(state: GameState, num: number) {
  console.log('[Walker Click]', num);
  // Open dossier for this walker
  activeDossierWalker = num;
  cachedActionsHtml = ''; // force re-render
}

function handleDossierTalk(state: GameState) {
  if (activeDossierWalker === null) return;
  const num = activeDossierWalker;
  activeDossierWalker = null;
  cachedActionsHtml = '';
  handleWalkerPicked(state, num);
}

function advanceIntro(state: GameState) {
  const isLast = state.introStep >= INTRO_STEPS.length - 1;
  if (isLast) {
    state.screen = 'game';
    state.lastTickTime = performance.now();
    addNarrative(state, 'The Walk begins. Route 1 stretches south into the Maine woods. One hundred walkers. One road.', 'narration');
    currentRenderedScreen = '';
    renderedNarrativeCount = 0;
  } else {
    state.introStep++;
    currentRenderedScreen = '';
  }
}

// ============================================================
// MAIN RENDER DISPATCHER
// ============================================================

export function render(state: GameState) {
  if (!app) return;
  gameState = state;

  // Horror CSS effects
  const root = document.documentElement;
  const horror = state.world.horrorTier;
  const clarity = state.player.clarity;
  root.style.setProperty('--hallucination-hue', `${horror > 2 ? (Math.sin(Date.now() / 5000) * 10) : 0}deg`);
  root.style.setProperty('--hallucination-intensity', String(horror > 2 ? (4 - clarity / 30) * 0.1 : 0));
  if (clarity < 20 && Math.random() < 0.01) {
    root.style.setProperty('--screen-shake', `${(Math.random() - 0.5) * 3}px`);
    setTimeout(() => root.style.setProperty('--screen-shake', '0px'), 100);
  }

  switch (state.screen) {
    case 'title': renderTitle(state); break;
    case 'creation': renderCreation(state); break;
    case 'intro': renderIntro(state); break;
    case 'game': renderGame(state); break;
    case 'gameover': renderGameOver(state); break;
  }
}

// ============================================================
// TITLE SCREEN
// ============================================================

function renderTitle(state: GameState) {
  if (currentRenderedScreen === 'title') return;
  currentRenderedScreen = 'title';
  app.innerHTML = `
    <div class="screen-creation" style="justify-content: center;">
      <div class="creation-title">THE LONG WALK</div>
      <div class="creation-subtitle">"The last one standing wins The Prize."</div>
      <p style="color: var(--text-dim); font-family: var(--font-narrative); margin: 2rem 0; max-width: 500px; text-align: center; line-height: 1.8;">
        100 walkers. One road. Keep above 4 mph or receive a warning.<br>
        Three warnings and you're out. Permanently.<br>
        The walk does not stop. There is no rest.<br>
        The last walker standing wins anything they want.
      </p>
      <button class="btn-begin" data-action="start">BEGIN THE WALK</button>
    </div>
  `;
}

// ============================================================
// CHARACTER CREATION
// ============================================================

function renderCreation(state: GameState) {
  if (currentRenderedScreen === 'creation') return;
  currentRenderedScreen = 'creation';
  app.innerHTML = `
    <div class="screen-creation">
      <div class="creation-title" style="font-size: 1.5rem;">WALKER #100 — NEW COLUMBIA</div>
      <div class="creation-subtitle">The 51st state. The outsider. The wildcard.</div>
      <div class="creation-form">
        <div class="form-group">
          <label>Your Name</label>
          <input type="text" id="input-name" placeholder="Enter your name" maxlength="30" />
        </div>
        <div class="form-group">
          <label>Your Age</label>
          <div class="motivation-options" id="age-options">
            <button class="motivation-btn" data-age="16">16</button>
            <button class="motivation-btn selected" data-age="17">17</button>
            <button class="motivation-btn" data-age="18">18</button>
          </div>
        </div>
        <div class="form-group">
          <label>Why did you enter the Long Walk?</label>
          <div class="motivation-options" id="reason-options">
            <button class="motivation-btn" data-reason="prove">"To prove something."</button>
            <button class="motivation-btn" data-reason="unknown">"I don't know."</button>
            <button class="motivation-btn" data-reason="someone">"For someone else."</button>
            <button class="motivation-btn" data-reason="prize">"For The Prize."</button>
          </div>
        </div>
        <div class="form-group">
          <label>What would your Prize be?</label>
          <input type="text" id="input-prize" placeholder="Anything you want..." maxlength="100" />
        </div>
        <button class="btn-begin" id="btn-begin" disabled>START THE WALK</button>
      </div>
    </div>
  `;

  let selectedAge = 17;
  let selectedReason: Reason | null = null;
  const nameInput = document.getElementById('input-name') as HTMLInputElement;
  const prizeInput = document.getElementById('input-prize') as HTMLInputElement;
  const beginBtn = document.getElementById('btn-begin') as HTMLButtonElement;

  function checkReady() {
    beginBtn.disabled = !(nameInput.value.trim() && selectedReason && prizeInput.value.trim());
  }

  nameInput.oninput = checkReady;
  prizeInput.oninput = checkReady;

  document.querySelectorAll('#age-options .motivation-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#age-options .motivation-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedAge = parseInt((btn as HTMLElement).dataset.age!);
    });
  });

  document.querySelectorAll('#reason-options .motivation-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#reason-options .motivation-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedReason = (btn as HTMLElement).dataset.reason as Reason;
      checkReady();
    });
  });

  beginBtn.onclick = () => {
    state.player.name = nameInput.value.trim();
    state.player.age = selectedAge;
    state.player.reason = selectedReason!;
    state.player.prize = prizeInput.value.trim();
    state.screen = 'intro';
    state.introStep = 0;
    currentRenderedScreen = '';
  };
}

// ============================================================
// INTRO SEQUENCE
// ============================================================

const INTRO_STEPS = [
  (s: GameState) => `<p>The morning is cold. October in Maine, at the Canadian border. The sky is the color of old steel.</p>
<p>One hundred boys stand in a loose column on Route 1. They are between sixteen and eighteen years old. They have volunteered for this.</p>
<p>You are Walker #100. ${escapeHtml(s.player.name)}, from New Columbia. The 51st state. Nobody here knows where that is. Nobody here knows you.</p>`,

  (s: GameState) => `<div class="major-speech">"Gentlemen. You have volunteered. You have been selected. You are the Long Walkers."</div>
<p>The Major's voice comes through the halftrack's speakers. Calm. Paternal. Terrifying.</p>
<div class="major-speech">"The rules are simple. Maintain four miles per hour. You will receive warnings for infractions. Three warnings, and you will... receive your ticket. The last walker standing receives The Prize."</div>
<p>He pauses. The silence is enormous.</p>
<div class="major-speech">"Good luck to you all."</div>`,

  (s: GameState) => `<p>The starting gun fires. Not a shot — just a sharp crack that splits the morning air.</p>
<p>One hundred boys begin to walk south.</p>
<p>You take your first step. Then another. The road stretches ahead, vanishing into the Maine woods.</p>
<p>The halftrack rumbles to life behind you. The crowd at the starting line cheers.</p>
<p>The Long Walk has begun.</p>
<p style="margin-top: 2rem; color: var(--text-dim);">Your Prize: <em>${escapeHtml(s.player.prize)}</em>. Remember why you're here.</p>`,
];

function renderIntro(state: GameState) {
  if (currentRenderedScreen === 'intro_' + state.introStep) return;
  currentRenderedScreen = 'intro_' + state.introStep;
  const step = state.introStep;
  const isLast = step >= INTRO_STEPS.length - 1;

  app.innerHTML = `
    <div class="screen-intro">
      <div class="intro-text">${INTRO_STEPS[step](state)}</div>
      <button class="btn-continue" data-action="intro-next">${isLast ? 'BEGIN WALKING' : 'CONTINUE'}</button>
    </div>
  `;
}

// ============================================================
// GAME SCREEN — Create Once, Update with Caching
// ============================================================

let gameStructureCreated = false;

function renderGame(state: GameState) {
  // NPC-initiated scripted dialogue disabled — LLM agents or nothing.

  if (!gameStructureCreated) {
    createGameStructure();
    gameStructureCreated = true;
    currentRenderedScreen = 'game';
    // Reset caches so first update always applies
    statusPanelCreated = false;
    cachedWalkersHtml = '';
    cachedActionsHtml = '';
    cachedControlsHtml = '';
    cachedDialogueHtml = '';
    cachedCrisisHtml = '';
    cachedSceneHtml = '';
    cachedApproachHtml = '';
  }

  updateHeader(state);
  updateNarrativeLog(state);
  updateStatusPanel(state);
  updateWalkersPanel(state);
  updateActionsPanel(state);
  updateGameControls(state);
  updateSceneOverlay(state);
  updateApproachBanner(state);
  updateCrisisOverlay(state);
  updateSpeechBubbles(state);
  updateDialogueOverlay(state);
  updateLLMChatOverlay(state);

  // Update bird's eye visualization
  const canvas = document.getElementById('viz-canvas') as HTMLCanvasElement;
  if (canvas) updateVisualization(state, canvas);
}

function createGameStructure() {
  app.innerHTML = `
    <div class="screen-game">
      <div class="game-header">
        <div class="header-title">THE LONG WALK</div>
        <div class="header-stats">
          <div class="header-stat">Mile: <span id="hdr-mile" class="value">0.0</span></div>
          <div class="header-stat">Hour: <span id="hdr-hour" class="value">0.0</span></div>
          <div class="header-stat">Time: <span id="hdr-time" class="value">7:00 AM</span></div>
          <div class="header-stat">Day: <span id="hdr-day" class="value">1</span></div>
          <div class="header-stat">Walkers: <span id="hdr-walkers" class="value walkers-count">100/100</span></div>
          <div class="header-stat">Warnings: <span id="hdr-warnings" class="value">0/3</span></div>
        </div>
      </div>
      <div class="game-main">
        <div class="viz-panel">
          <canvas id="viz-canvas" width="350" height="600"></canvas>
        </div>
        <div class="narrative-panel" id="narrative-panel" role="log" aria-live="polite"></div>
      </div>
      <div class="game-bottom">
        <div class="status-panel" id="status-panel"></div>
        <div class="walkers-panel" id="walkers-panel"></div>
        <div class="actions-panel" id="actions-panel"></div>
      </div>
      <div class="game-controls" id="game-controls"></div>
      <div id="scene-container"></div>
      <div id="approach-container"></div>
      <div id="speech-bubble-container"></div>
      <div id="crisis-container"></div>
      <div id="dialogue-container"></div>
      <div id="llm-chat-container"></div>
    </div>
  `;

  // Init visualization canvas
  const canvas = document.getElementById('viz-canvas') as HTMLCanvasElement;
  if (canvas) initVisualization(canvas);
}

// --- Header: targeted textContent updates (never blinks) ---
function updateHeader(state: GameState) {
  const p = state.player;
  const w = state.world;
  const remaining = getWalkersRemaining(state);

  setText('hdr-mile', w.milesWalked.toFixed(1));
  setText('hdr-hour', w.hoursElapsed.toFixed(1));
  setText('hdr-time', w.currentTime);
  setText('hdr-day', String(w.dayNumber));
  setText('hdr-walkers', `${remaining}/100`);

  const warnEl = document.getElementById('hdr-warnings');
  if (warnEl) {
    warnEl.textContent = `${p.warnings}/3`;
    warnEl.className = p.warnings > 0 ? 'value warning-active' : 'value';
  }
}

// --- Narrative log: append-only (never rebuilds) ---
function updateNarrativeLog(state: GameState) {
  const panel = document.getElementById('narrative-panel');
  if (!panel) return;

  const entries = state.narrativeLog;

  // If log was trimmed, rebuild
  if (renderedNarrativeCount > entries.length) {
    panel.innerHTML = '';
    renderedNarrativeCount = 0;
  }

  // Append only new entries
  if (entries.length > renderedNarrativeCount) {
    const fragment = document.createDocumentFragment();
    for (let i = renderedNarrativeCount; i < entries.length; i++) {
      const e = entries[i];
      const div = document.createElement('div');
      div.className = `narrative-entry type-${e.type}`;
      div.innerHTML = `<span class="mile-marker">[${e.mile.toFixed(1)}]</span> ${escapeHtml(e.text)}`;
      fragment.appendChild(div);
    }
    panel.appendChild(fragment);
    renderedNarrativeCount = entries.length;
    panel.scrollTop = panel.scrollHeight;
  }
}

// --- Status panel: create once, update via targeted DOM ops ---
let statusPanelCreated = false;

function createStatusPanel(el: HTMLElement, state: GameState) {
  const p = state.player;
  el.innerHTML = `
    <div class="panel-title">STATUS — ${escapeHtml(p.name).toUpperCase()} #100</div>
    <div class="stat-row">
      <span class="stat-label">Speed</span>
      <span class="stat-value" id="sp-speed">${p.speed.toFixed(1)} mph</span>
    </div>
    <div class="speed-meter" id="sp-meter">
      <div class="speed-meter-bar" id="sp-meter-bar"></div>
      <div class="speed-meter-peak" id="sp-meter-peak"></div>
      <div class="speed-meter-danger" id="sp-meter-danger"></div>
      <div class="speed-meter-target" id="sp-meter-target"></div>
    </div>
    <div class="stat-row">
      <span class="stat-label">Effort</span>
      <span class="stat-value" id="sp-effort">${p.effort}%</span>
    </div>
    <div class="speed-control">
      <button class="speed-btn" data-action="effort-down">◀</button>
      <input type="range" min="0" max="100" value="${p.effort}" id="effort-slider" style="flex:1;" />
      <button class="speed-btn" data-action="effort-up">▶</button>
      <span class="speed-display" id="sp-effort-val">${p.effort}%</span>
    </div>
    <div class="warning-display" id="sp-warnings"></div>
    <div class="stat-row"><span class="stat-label" style="width:28px">STA</span><div class="stat-bar"><div class="stat-bar-fill" id="sp-bar-sta"></div></div><span class="stat-value" id="sp-val-sta" style="width:24px;text-align:right;font-size:0.7rem;"></span></div>
    <div class="stat-row"><span class="stat-label" style="width:28px">HYD</span><div class="stat-bar"><div class="stat-bar-fill" id="sp-bar-hyd"></div></div><span class="stat-value" id="sp-val-hyd" style="width:24px;text-align:right;font-size:0.7rem;"></span></div>
    <div class="stat-row"><span class="stat-label" style="width:28px">HUN</span><div class="stat-bar"><div class="stat-bar-fill" id="sp-bar-hun"></div></div><span class="stat-value" id="sp-val-hun" style="width:24px;text-align:right;font-size:0.7rem;"></span></div>
    <div class="stat-row"><span class="stat-label" style="width:28px">PAI</span><div class="stat-bar"><div class="stat-bar-fill" id="sp-bar-pai"></div></div><span class="stat-value" id="sp-val-pai" style="width:24px;text-align:right;font-size:0.7rem;"></span></div>
    <div class="stat-row"><span class="stat-label" style="width:28px">MOR</span><div class="stat-bar"><div class="stat-bar-fill" id="sp-bar-mor"></div></div><span class="stat-value" id="sp-val-mor" style="width:24px;text-align:right;font-size:0.7rem;"></span></div>
    <div class="stat-row"><span class="stat-label" style="width:28px">CLR</span><div class="stat-bar"><div class="stat-bar-fill" id="sp-bar-clr"></div></div><span class="stat-value" id="sp-val-clr" style="width:24px;text-align:right;font-size:0.7rem;"></span></div>
    <div class="stat-row"><span class="stat-label" style="width:28px">BDR</span><div class="stat-bar"><div class="stat-bar-fill" id="sp-bar-bdr"></div></div><span class="stat-value" id="sp-val-bdr" style="width:24px;text-align:right;font-size:0.7rem;"></span></div>
    <div class="stat-row"><span class="stat-label" style="width:28px">BWL</span><div class="stat-bar"><div class="stat-bar-fill" id="sp-bar-bwl"></div></div><span class="stat-value" id="sp-val-bwl" style="width:24px;text-align:right;font-size:0.7rem;"></span></div>
    <div class="env-info">
      <div id="sp-weather"></div>
      <div id="sp-terrain"></div>
      <div id="sp-crowd"></div>
      <div id="sp-act"></div>
    </div>
    <div style="margin-top:0.5rem;">
      <div class="panel-title">POSITION</div>
      <div style="display:flex;gap:0.3rem;">
        <button class="speed-btn" style="flex:1;font-size:0.6rem;" data-action="pos-front" id="sp-pos-front">front</button>
        <button class="speed-btn" style="flex:1;font-size:0.6rem;" data-action="pos-middle" id="sp-pos-middle">middle</button>
        <button class="speed-btn" style="flex:1;font-size:0.6rem;" data-action="pos-back" id="sp-pos-back">back</button>
      </div>
    </div>
  `;
  statusPanelCreated = true;
}

function updateStatusPanel(state: GameState) {
  const el = document.getElementById('status-panel');
  if (!el) return;

  if (!statusPanelCreated) {
    createStatusPanel(el, state);
  }

  const p = state.player;
  const w = state.world;

  // Speed display
  const speedEl = document.getElementById('sp-speed');
  if (speedEl) {
    speedEl.textContent = `${p.speed.toFixed(1)} mph`;
    speedEl.style.color = p.speed < 4 ? 'var(--accent-red)' : p.speed < 4.3 ? 'var(--accent-amber)' : 'var(--text-primary)';
  }

  // EQ-style speed meter (0-7 mph range)
  const meterPct = Math.min(100, (p.speed / 7) * 100);
  const dangerPct = (4 / 7) * 100; // 4.0 mph danger line
  const targetPct = Math.min(100, p.effort);

  const meterBar = document.getElementById('sp-meter-bar');
  if (meterBar) {
    meterBar.style.width = `${meterPct}%`;
    // Color: green above 4.0, amber near 4.0, red below
    meterBar.style.background = p.speed < 4
      ? 'var(--accent-red)'
      : p.speed < 4.3
      ? 'linear-gradient(90deg, var(--accent-amber), var(--accent-amber))'
      : 'linear-gradient(90deg, #0a4, #0f6)';
    // Glow effect for dynamic feel
    meterBar.style.boxShadow = p.speed < 4
      ? '0 0 8px var(--accent-red)'
      : '0 0 4px rgba(0,255,100,0.3)';
  }

  // Peak hold indicator (slowly falls)
  const peakEl = document.getElementById('sp-meter-peak');
  if (peakEl) {
    const currentPeakLeft = parseFloat(peakEl.style.left || '0');
    const newPeak = meterPct;
    // Peak rises instantly, falls slowly
    const displayPeak = newPeak > currentPeakLeft ? newPeak : Math.max(newPeak, currentPeakLeft - 0.3);
    peakEl.style.left = `${displayPeak}%`;
  }

  // Danger line at 4.0 mph
  const dangerEl = document.getElementById('sp-meter-danger');
  if (dangerEl) {
    dangerEl.style.left = `${dangerPct}%`;
  }

  // Target speed indicator
  const targetMarker = document.getElementById('sp-meter-target');
  if (targetMarker) {
    targetMarker.style.left = `${targetPct}%`;
  }

  // Effort display
  const effortEl = document.getElementById('sp-effort');
  if (effortEl) {
    effortEl.textContent = `${p.effort}%`;
    effortEl.style.color = p.speed < 4 ? 'var(--accent-red)' : 'var(--text-primary)';
  }
  const effortValEl = document.getElementById('sp-effort-val');
  if (effortValEl) {
    effortValEl.textContent = `${p.effort}%`;
    effortValEl.className = `speed-display ${p.speed < 4 ? 'danger' : ''}`;
  }

  // Effort slider — update without replacing (only if user isn't dragging)
  const slider = document.getElementById('effort-slider') as HTMLInputElement;
  if (slider && document.activeElement !== slider) {
    const newVal = String(p.effort);
    if (slider.value !== newVal) slider.value = newVal;
    slider.style.accentColor = p.speed < 4 ? 'var(--accent-red)' : 'var(--accent-blue)';
  }

  // Warning pips (cached to prevent 5fps innerHTML rebuilds)
  const warnEl = document.getElementById('sp-warnings');
  if (warnEl) {
    let warnHtml = [0, 1, 2].map(i =>
      `<div class="warning-pip ${i < p.warnings ? 'active' : ''}">${i < p.warnings ? '!' : ''}</div>`
    ).join('');
    if (p.warnings > 0) {
      warnHtml += `<span style="font-size:0.6rem;color:var(--text-dim);margin-left:0.5rem;">walk-off: ${Math.max(0, 60 - p.warningTimer).toFixed(0)}m</span>`;
    }
    if (warnHtml !== cachedWarningHtml) {
      warnEl.innerHTML = warnHtml;
      cachedWarningHtml = warnHtml;
    }
  }

  // Stat bars — targeted updates
  updateStatBar('sta', p.stamina, false);
  updateStatBar('hyd', p.hydration, false);
  updateStatBar('hun', p.hunger, false);
  updateStatBar('pai', p.pain, true);
  updateStatBar('mor', p.morale, false);
  updateStatBar('clr', p.clarity, false);
  updateStatBar('bdr', p.bladder, true);
  updateStatBar('bwl', p.bowel, true);

  // Environment info
  setText('sp-weather', `Weather: ${w.weather.replace('_', ' ')}`);
  setText('sp-terrain', `Terrain: ${w.terrain}`);
  setText('sp-crowd', `Crowd: ${w.crowdMood}`);
  setText('sp-act', `Act: ${w.currentAct} | Horror: T${w.horrorTier}`);

  // Position buttons — update active state without rebuilding
  for (const pos of ['front', 'middle', 'back'] as PackPosition[]) {
    const btn = document.getElementById(`sp-pos-${pos}`);
    if (btn) {
      const isActive = p.position === pos;
      btn.style.borderColor = isActive ? 'var(--accent-blue)' : '';
      btn.style.color = isActive ? 'var(--accent-blue)' : '';
    }
  }
}

function updateStatBar(id: string, value: number, inverted: boolean) {
  const pct = Math.max(0, Math.min(100, value));
  const colorClass = inverted
    ? (pct > 70 ? 'danger' : pct > 40 ? 'caution' : 'good')
    : (pct > 60 ? 'good' : pct > 30 ? 'caution' : 'danger');
  const bar = document.getElementById(`sp-bar-${id}`) as HTMLElement;
  if (bar) {
    bar.style.width = `${pct}%`;
    bar.className = `stat-bar-fill ${colorClass}`;
  }
  const val = document.getElementById(`sp-val-${id}`);
  if (val) val.textContent = String(Math.round(pct));
}

// --- Walkers panel: cached ---
function updateWalkersPanel(state: GameState) {
  const el = document.getElementById('walkers-panel');
  if (!el) return;

  const nearby = getNearbyWalkers(state);
  const items = nearby.map(w => {
    const data = getWalkerData(state, w.walkerNumber);
    if (!data) return '';
    const tier = getRelationshipTier(w);
    const dispLabel = w.behavioralState === 'struggling' && tier === 'wary' ? 'struggling' : tier;
    const warnings = w.warnings > 0 ? `<span class="walker-warnings">${'!'.repeat(w.warnings)}</span>` : '';
    return `
      <div class="walker-item" data-walker="${w.walkerNumber}">
        <div>
          <span class="walker-name">${data.name}</span>
          <span class="walker-number">#${w.walkerNumber}</span>
          ${warnings}
        </div>
        <span class="walker-disposition ${dispLabel}">${dispLabel}</span>
      </div>
    `;
  }).join('');

  const html = `
    <div class="panel-title">NEARBY WALKERS (${state.player.position.toUpperCase()}) — ${nearby.length}</div>
    ${items || '<div style="color:var(--text-dim);font-size:0.75rem;padding:0.5rem;">No walkers nearby.</div>'}
  `;

  if (html !== cachedWalkersHtml) {
    el.innerHTML = html;
    cachedWalkersHtml = html;
  }
}

// --- Walker dossier ---
function renderDossier(state: GameState, walkerNum: number): string {
  const w = getWalkerState(state, walkerNum);
  const data = getWalkerData(state, walkerNum);
  if (!w || !data) return '<div class="panel-title">Unknown Walker</div>';

  const relLabel = getRelationshipTier(w);
  const statusLabel = !w.alive ? 'Eliminated'
    : w.behavioralState === 'breaking_down' ? 'Breaking Down'
    : w.behavioralState === 'struggling' ? 'Struggling'
    : 'Steady';
  const canTalk = w.alive && state.llmAvailable && data.tier <= 2;

  let factsHtml = '';
  if (w.revealedFacts.length > 0) {
    factsHtml = `<div class="dossier-section">
      <div class="dossier-label">WHAT YOU KNOW</div>
      ${w.revealedFacts.map(f => `<div class="dossier-fact">${escapeHtml(f)}</div>`).join('')}
    </div>`;
  }

  return `
    <div class="dossier-panel">
      <div class="dossier-header">
        <div class="dossier-name">${data.name.toUpperCase()}</div>
        <div class="dossier-num">#${data.walkerNumber}</div>
      </div>
      <div class="dossier-meta">${data.age} | ${data.homeState} | ${data.psychologicalArchetype}</div>
      <div class="dossier-stats">
        <div>Relationship: <span class="walker-disposition ${relLabel.toLowerCase()}">${relLabel}</span> (${w.relationship})</div>
        <div>Talks: ${w.conversationCount} | Alliance: ${w.isAlliedWithPlayer ? 'Yes' : 'No'}</div>
        <div>Status: ${statusLabel} | Warnings: ${w.warnings}/3</div>
      </div>
      ${factsHtml}
      <div class="dossier-actions">
        ${canTalk ? `<button class="action-btn dossier-talk-btn" data-action="dossier-talk"><span class="si si-talk">${ICON.talk}</span>Talk</button>` : ''}
        <button class="action-btn" data-action="dossier-close">Close</button>
      </div>
    </div>
  `;
}

// --- Actions panel: cached ---
function updateActionsPanel(state: GameState) {
  const el = document.getElementById('actions-panel');
  if (!el) return;

  // Show dossier if active
  if (activeDossierWalker !== null) {
    const dossierHtml = renderDossier(state, activeDossierWalker);
    if (dossierHtml !== cachedActionsHtml) {
      el.innerHTML = dossierHtml;
      cachedActionsHtml = dossierHtml;
    }
    return;
  }

  const p = state.player;
  const nearby = getNearbyWalkers(state);
  const inCrisis = !!p.activeCrisis;
  const foodDisabled = p.foodCooldown > 0 || inCrisis;
  const waterDisabled = p.waterCooldown > 0 || inCrisis;
  const talkDisabled = nearby.length === 0 || inCrisis;

  // Close picker if LLM dialogue opened
  if (state.llmDialogue) walkerPickerOpen = false;

  let pickerHtml = '';
  if (walkerPickerOpen && nearby.length > 0) {
    const items = nearby.map(w => {
      const d = getWalkerData(state, w.walkerNumber);
      if (!d) return '';
      const rel = getRelationshipTier(w);
      const tierLabel = d.tier === 1 ? 'T1' : d.tier === 2 ? 'T2' : 'T3';
      const tierClass = d.tier <= 2 ? 'tier-major' : 'tier-minor';
      const allyBadge = w.isAlliedWithPlayer ? ' <span class="walker-ally-badge">ALLY</span>' : '';
      return `
        <button class="picker-item" data-pick-walker="${w.walkerNumber}">
          <span class="picker-name">${d.name} <span class="picker-num">#${w.walkerNumber}</span>${allyBadge}</span>
          <span class="picker-info"><span class="picker-tier ${tierClass}">${tierLabel}</span> <span class="walker-disposition ${rel}">${rel}</span></span>
        </button>`;
    }).join('');

    pickerHtml = `
      <div class="walker-picker">
        <div class="picker-title">Who do you want to talk to?</div>
        ${items}
      </div>`;
  }

  // Share buttons: only when ally is nearby at same position and cooldowns are ready
  let shareHtml = '';
  if (!inCrisis) {
    const nearbyAlly = state.player.alliances.find(num => {
      const w = getWalkerState(state, num);
      return w && w.alive && w.position === state.player.position;
    });
    if (nearbyAlly != null) {
      const allyData = getWalkerData(state, nearbyAlly);
      const allyName = allyData ? allyData.name : `#${nearbyAlly}`;
      const shareFoodDisabled = p.foodCooldown > 0;
      const shareWaterDisabled = p.waterCooldown > 0;
      shareHtml = `
        <div class="share-divider">SHARE WITH ${allyName.toUpperCase()}</div>
        <button class="action-btn share-btn" data-action="share-food" ${shareFoodDisabled ? 'disabled' : ''}>
          Share Food ${shareFoodDisabled ? `(${Math.ceil(p.foodCooldown)}m)` : ''}
        </button>
        <button class="action-btn share-btn" data-action="share-water" ${shareWaterDisabled ? 'disabled' : ''}>
          Share Water ${shareWaterDisabled ? `(${Math.ceil(p.waterCooldown)}m)` : ''}
        </button>`;
    }
  }

  const thinkDisabled = inCrisis || (state.world.milesWalked - p.lastThinkMile) < 5;
  const thinkCd = !inCrisis && (state.world.milesWalked - p.lastThinkMile) < 5
    ? ` (${Math.ceil(5 - (state.world.milesWalked - p.lastThinkMile))}mi)` : '';

  const html = `
    <div class="panel-title">ACTIONS</div>
    <button class="action-btn ${walkerPickerOpen ? 'active' : ''}" data-action="talk" ${talkDisabled ? 'disabled' : ''}><span class="si si-talk">${ICON.talk}</span>Talk</button>
    ${pickerHtml}
    <button class="action-btn" data-action="food" ${foodDisabled ? 'disabled' : ''}>
      <span class="si si-food">${ICON.food}</span>Food ${foodDisabled ? `(${Math.ceil(p.foodCooldown)}m)` : ''}
    </button>
    <button class="action-btn" data-action="water" ${waterDisabled ? 'disabled' : ''}>
      <span class="si si-water">${ICON.water}</span>Water ${waterDisabled ? `(${Math.ceil(p.waterCooldown)}m)` : ''}
    </button>
    ${shareHtml}
    <button class="action-btn" data-action="pee" ${inCrisis || p.bladder < 20 ? 'disabled' : ''}>
      Pee ${p.bladder >= 20 ? `(1 warning)` : ''}
    </button>
    <button class="action-btn" data-action="poop" ${inCrisis || p.bowel < 20 ? 'disabled' : ''}>
      Poop ${p.bowel >= 20 ? `(2 warnings)` : ''}
    </button>
    <button class="action-btn" data-action="observe" ${inCrisis ? 'disabled' : ''}><span class="si si-observe">${ICON.observe}</span>Look Around</button>
    <button class="action-btn" data-action="think" ${thinkDisabled ? 'disabled' : ''}><span class="si si-think">${ICON.think}</span>Prize${thinkCd}</button>
  `;

  if (html !== cachedActionsHtml) {
    el.innerHTML = html;
    cachedActionsHtml = html;
  }
}

// --- Game controls: cached ---
function updateGameControls(state: GameState) {
  const el = document.getElementById('game-controls');
  if (!el) return;

  const muted = getIsMuted();
  const html = `
    ${[1, 2, 4, 8].map(s =>
      `<button class="game-speed-btn ${state.gameSpeed === s ? 'active' : ''}" data-action="speed-${s}">${s}x</button>`
    ).join('')}
    <button class="pause-btn ${state.isPaused ? 'paused' : ''}" data-action="pause">${state.isPaused ? 'PAUSED' : 'PAUSE'}</button>
    <button class="mute-btn ${muted ? 'muted' : ''}" data-action="mute">${muted ? 'UNMUTE' : 'MUTE'}</button>
  `;

  if (html !== cachedControlsHtml) {
    el.innerHTML = html;
    cachedControlsHtml = html;
  }
}

// --- Scene handlers (exported for keyboard shortcuts in main.ts) ---
export function handleSceneNext(state: GameState) {
  if (!state.activeScene) return;
  if (state.activeScene.currentPanel < state.activeScene.panels.length - 1) {
    state.activeScene.currentPanel++;
    // Direct DOM update to avoid full innerHTML rebuild (which re-triggers fadeIn animation)
    const scene = state.activeScene;
    const panel = scene.panels[scene.currentPanel];
    const isLast = scene.currentPanel >= scene.panels.length - 1;
    const textEl = document.querySelector('.scene-text');
    if (textEl) textEl.innerHTML = escapeHtml(panel.text);
    const counterEl = document.querySelector('.scene-counter');
    if (counterEl) counterEl.textContent = `${scene.currentPanel + 1}/${scene.panels.length}`;
    if (isLast) {
      const btn = document.querySelector('.scene-btn') as HTMLElement;
      if (btn) {
        btn.setAttribute('data-action', 'scene-close');
        btn.textContent = 'Continue Walking';
      }
    }
    // Regenerate template HTML to match updateSceneOverlay exactly (prevents cache mismatch blink)
    cachedSceneHtml = `
    <div class="scene-overlay">
      <div class="scene-box" role="dialog" aria-modal="true">
        <div class="scene-text">${escapeHtml(panel.text)}</div>
        <div class="scene-footer">
          <span class="scene-counter">${scene.currentPanel + 1}/${scene.panels.length}</span>
          ${isLast
            ? '<button class="scene-btn" data-action="scene-close">Continue Walking</button>'
            : '<button class="scene-btn" data-action="scene-next">>>> </button>'}
        </div>
      </div>
    </div>
  `;
  }
}

export function handleSceneClose(state: GameState) {
  if (!state.activeScene) return;
  // Add scene text to narrative log for posterity
  for (const panel of state.activeScene.panels) {
    addNarrative(state, panel.text, panel.type);
  }
  state.activeScene = null;
  state.isPaused = false;
  // Clear DOM immediately — don't just clear cache, or updateSceneOverlay won't know to clear
  const container = document.getElementById('scene-container');
  if (container) container.innerHTML = '';
  cachedSceneHtml = '';
}

// --- Approach handlers ---
function handleApproachReply(state: GameState) {
  if (!state.activeApproach) return;
  const approach = state.activeApproach;
  // Open LLM chat with this walker, pre-seeded with their opening line
  const walkerNum = approach.walkerId;
  const w = getWalkerState(state, walkerNum);
  const data = getWalkerData(state, walkerNum);
  if (!w || !w.alive || !data) {
    state.activeApproach = null;
    cachedApproachHtml = '';
    return;
  }
  // Set up LLM dialogue with approach text as first walker message
  if (state.llmDialogue) state.llmDialogue = null;
  state.llmDialogue = {
    walkerId: walkerNum,
    walkerName: data.name,
    messages: [{ role: 'walker', text: approach.text }],
    isStreaming: false,
    streamBuffer: '',
  };
  state.activeApproach = null;
  cachedApproachHtml = '';
  approachCreated = false;
}

function handleApproachNod(state: GameState) {
  if (!state.activeApproach) return;
  const w = getWalkerState(state, state.activeApproach!.walkerId);
  if (w) {
    w.relationship = Math.min(100, w.relationship + 3);
    w.conversationCount++;
  }
  addNarrative(state, `You nod at ${state.activeApproach.walkerName}. They seem satisfied.`, 'narration');
  state.activeApproach = null;
  cachedApproachHtml = '';
  approachCreated = false;
}

function handleApproachIgnore(state: GameState) {
  if (!state.activeApproach) return;
  const w = getWalkerState(state, state.activeApproach!.walkerId);
  if (w) {
    w.relationship = Math.max(-100, w.relationship - 2);
  }
  addNarrative(state, `You keep your eyes ahead. ${state.activeApproach.walkerName} falls back.`, 'narration');
  state.activeApproach = null;
  cachedApproachHtml = '';
  approachCreated = false;
}

// --- Scene overlay: cached ---
function updateSceneOverlay(state: GameState) {
  const container = document.getElementById('scene-container');
  if (!container) return;

  if (!state.activeScene) {
    if (cachedSceneHtml !== '') {
      container.innerHTML = '';
      cachedSceneHtml = '';
    }
    return;
  }

  const scene = state.activeScene;
  const panel = scene.panels[scene.currentPanel];
  const isLast = scene.currentPanel >= scene.panels.length - 1;

  const html = `
    <div class="scene-overlay">
      <div class="scene-box" role="dialog" aria-modal="true">
        <div class="scene-text">${escapeHtml(panel.text)}</div>
        <div class="scene-footer">
          <span class="scene-counter">${scene.currentPanel + 1}/${scene.panels.length}</span>
          ${isLast
            ? '<button class="scene-btn" data-action="scene-close">Continue Walking</button>'
            : '<button class="scene-btn" data-action="scene-next">>>> </button>'}
        </div>
      </div>
    </div>
  `;

  if (html !== cachedSceneHtml) {
    container.innerHTML = html;
    cachedSceneHtml = html;
  }
}

// --- Approach banner: stable DOM (create once, update text only) ---
let approachCreated = false;

function updateApproachBanner(state: GameState) {
  const container = document.getElementById('approach-container');
  if (!container) return;

  // Don't show approach during crisis or scene
  if (!state.activeApproach || state.player.activeCrisis || state.activeScene) {
    if (cachedApproachHtml !== '' || approachCreated) {
      container.innerHTML = '';
      cachedApproachHtml = '';
      approachCreated = false;
    }
    return;
  }

  const approach = state.activeApproach;

  // Auto-dismiss after 30 real seconds → defaults to "Nod"
  if (Date.now() - approach.startTime > 30000) {
    handleApproachNod(state);
    return;
  }

  const displayText = approach.isStreaming
    ? (approach.streamBuffer || '...')
    : approach.text;

  // If banner already exists, just update text (preserves button DOM — no click race)
  if (approachCreated) {
    const textEl = container.querySelector('.approach-text');
    if (textEl) textEl.innerHTML = `"${escapeHtml(displayText)}"`;
    // Enable Reply button when streaming finishes
    if (!approach.isStreaming) {
      const replyBtn = container.querySelector('.approach-reply') as HTMLButtonElement;
      if (replyBtn && replyBtn.disabled) replyBtn.disabled = false;
    }
    return;
  }

  // First render: create full banner DOM
  const html = `
    <div class="approach-banner">
      <div class="approach-intro">${approach.walkerName} falls into step beside you.</div>
      <div class="approach-text">"${escapeHtml(displayText)}"</div>
      <div class="approach-actions">
        <button class="approach-btn approach-reply" data-action="approach-reply" ${approach.isStreaming ? 'disabled' : ''}>Reply</button>
        <button class="approach-btn approach-nod" data-action="approach-nod">Nod</button>
        <button class="approach-btn approach-ignore" data-action="approach-ignore">Ignore</button>
      </div>
    </div>
  `;

  container.innerHTML = html;
  cachedApproachHtml = html;
  approachCreated = true;
}

// --- Speech Bubble System ---
function updateSpeechBubbles(state: GameState) {
  const container = document.getElementById('speech-bubble-container');
  if (!container) return;

  const now = Date.now();

  // Remove expired bubbles
  state.speechBubbles = state.speechBubbles.filter(b => now - b.startTime < b.duration);

  if (state.speechBubbles.length === 0) {
    if (container.innerHTML !== '') container.innerHTML = '';
    return;
  }

  const bubblesHtml = state.speechBubbles.map(b => {
    const age = now - b.startTime;
    const fadeOut = age > b.duration - 600;
    const cls = `speech-bubble sb-${b.position} sb-${b.type}${fadeOut ? ' sb-fading' : ''}`;
    return `<div class="${cls}"><div class="sb-speaker">${escapeHtml(b.speaker)}</div><div class="sb-text">${escapeHtml(b.text)}</div></div>`;
  }).join('');

  container.innerHTML = bubblesHtml;
}

export function addSpeechBubble(state: GameState, speaker: string, text: string, type: 'overheard' | 'warning_reaction', position: 'left' | 'right', durationMs = 6000) {
  // Limit to 4 visible bubbles
  if (state.speechBubbles.length >= 4) {
    state.speechBubbles.shift();
  }
  state.speechBubbles.push({
    id: state.nextBubbleId++,
    speaker,
    text,
    startTime: Date.now(),
    duration: durationMs,
    position,
    type,
  });
}

export function queueOverheardBubbles(state: GameState, lines: Array<{speaker: string, text: string}>) {
  let delay = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const position: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
    const duration = Math.max(4000, line.text.length * 55);
    setTimeout(() => {
      addSpeechBubble(state, line.speaker, line.text, 'overheard', position, duration);
    }, delay);
    delay += 2500;
  }
}

// --- Crisis overlay: cached ---
function updateCrisisOverlay(state: GameState) {
  const container = document.getElementById('crisis-container');
  if (!container) return;

  const crisis = state.player.activeCrisis;
  if (!crisis) {
    if (cachedCrisisHtml !== '') {
      container.innerHTML = '';
      cachedCrisisHtml = '';
    }
    return;
  }

  const timerPct = Math.max(0, (crisis.timeRemaining / crisis.timeLimit) * 100);
  const timerColor = timerPct > 50 ? 'var(--accent-blue)' : timerPct > 20 ? 'var(--accent-amber)' : 'var(--accent-red)';
  const timerSecs = Math.ceil(crisis.timeRemaining); // already in real seconds

  // If crisis structure already exists, just update the timer (avoids full DOM rebuild every 200ms)
  if (cachedCrisisHtml !== '' && cachedCrisisHtml === crisis.title) {
    const timerText = container.querySelector('.crisis-timer-text');
    if (timerText) timerText.textContent = `${timerSecs}s`;
    const timerFill = container.querySelector('.crisis-timer-fill') as HTMLElement;
    if (timerFill) {
      timerFill.style.width = `${timerPct}%`;
      timerFill.style.background = timerColor;
    }
    return;
  }

  // Check if ally is nearby for ally-required options
  const hasAllyNearby = state.player.alliances.some(num => {
    const w = getWalkerState(state, num);
    return w && w.alive && w.position === state.player.position;
  });

  const optionsHtml = crisis.options.map((opt, i) => {
    const disabled = opt.requiresAlly && !hasAllyNearby;
    const allyTag = opt.requiresAlly ? '<span class="crisis-ally-tag">ALLY</span>' : '';
    return `
      <button class="crisis-option ${disabled ? 'disabled' : ''} ${opt.requiresAlly ? 'ally-option' : ''}"
        data-crisis-option="${opt.id}" ${disabled ? 'disabled' : ''}>
        <span class="crisis-option-key">${i + 1}</span>
        <span class="crisis-option-text">
          <strong>${escapeHtml(opt.label)}</strong> ${allyTag}
          <span class="crisis-option-desc">${escapeHtml(opt.description)}</span>
        </span>
      </button>`;
  }).join('');

  container.innerHTML = `
    <div class="crisis-overlay">
      <div class="crisis-box" role="dialog" aria-modal="true">
        <div class="crisis-header">
          <div class="crisis-title">${escapeHtml(crisis.title)}</div>
          <div class="crisis-timer">
            <span class="crisis-timer-text">${timerSecs}s</span>
            <div class="crisis-timer-bar">
              <div class="crisis-timer-fill" style="width:${timerPct}%;background:${timerColor};"></div>
            </div>
          </div>
        </div>
        <div class="crisis-description">${escapeHtml(crisis.description)}</div>
        <div class="crisis-options">
          ${optionsHtml}
        </div>
      </div>
    </div>
  `;
  // Store crisis title as sentinel — rebuilt only when a new crisis appears
  cachedCrisisHtml = crisis.title;
}

// --- Dialogue overlay: cached ---
function updateDialogueOverlay(state: GameState) {
  const container = document.getElementById('dialogue-container');
  if (!container) return;

  if (!state.activeDialogue) {
    if (cachedDialogueHtml !== '') {
      container.innerHTML = '';
      cachedDialogueHtml = '';
    }
    return;
  }

  const d = state.activeDialogue;
  const w = getWalkerState(state, d.walkerNumber);
  const relLabel = !w ? '' : w.relationship > 40 ? '+++' : w.relationship > 20 ? '++' : w.relationship > 0 ? '+' : w.relationship > -20 ? '-' : '--';

  const optionsHtml = d.options.map((opt, i) =>
    `<button class="dialogue-option" data-option="${i}">${escapeHtml(opt.text)}</button>`
  ).join('');

  const html = `
    <div class="dialogue-overlay">
      <div class="dialogue-box">
        <div class="dialogue-speaker">${escapeHtml(d.walkerName)} (#${d.walkerNumber}) — ${relLabel}</div>
        <div class="dialogue-text">${escapeHtml(d.text)}</div>
        <div class="dialogue-options">
          ${optionsHtml}
          <button class="dialogue-option" data-option="-1" style="color:var(--text-dim);">[Walk away]</button>
        </div>
      </div>
    </div>
  `;

  if (html !== cachedDialogueHtml) {
    container.innerHTML = html;
    cachedDialogueHtml = html;
  }
}

// --- LLM Chat overlay (stable DOM — create once, append-only messages) ---
let llmOverlayCreated = false;
let llmOverlayWalkerId = -1;
let renderedChatMsgCount = 0;
let llmStreamingShown = false;
let pausedFromChat = false;
let chatOpenRelationship = 0;  // relationship value when chat opened (for trend arrow)

function createLLMOverlay(container: HTMLElement, dlg: GameState['llmDialogue']) {
  if (!dlg) return;
  const w = gameState?.walkers.find(ws => ws.walkerNumber === dlg.walkerId);
  const relLabel = !w ? '' : getRelationshipTier(w);
  const fillPct = !w ? 50 : ((w.relationship + 100) / 200) * 100;
  chatOpenRelationship = w ? w.relationship : 0;

  container.innerHTML = `
    <div class="dialogue-overlay" id="llm-overlay-bg">
      <div class="llm-chat-box" role="dialog" aria-modal="true">
        <button class="chat-close-btn" data-action="close-chat" aria-label="Close">&times;</button>
        <div class="llm-chat-header">
          <div>
            <span class="dialogue-speaker" id="llm-speaker">${escapeHtml(dlg.walkerName)} (#${dlg.walkerId})</span>
            <div style="display:flex;align-items:center;gap:0.3rem;">
              <button class="stop-world-btn" data-action="toggle-pause-chat" id="llm-pause-btn">\u25A0 STOP</button>
            </div>
          </div>
          <div class="chat-rel-row">
            <div class="rel-gauge">
              <div class="rel-gauge-bar">
                <div class="rel-gauge-marker" id="llm-rel-marker" style="left:${fillPct}%"></div>
              </div>
              <span class="walker-disposition ${relLabel}" id="llm-rel-label">${relLabel}</span>
              <span class="rel-gauge-trend" id="llm-rel-trend"></span>
            </div>
          </div>
          <div class="chat-stat-bars" id="chat-stat-bars">
            <div class="chat-stat"><span class="chat-stat-lbl">YOU</span><span class="chat-stat-lbl">MRL</span><div class="chat-stat-track"><div class="chat-stat-fill morale" id="cs-p-morale" style="width:75%"></div></div></div>
            <div class="chat-stat"><span class="chat-stat-lbl"></span><span class="chat-stat-lbl">STM</span><div class="chat-stat-track"><div class="chat-stat-fill stamina" id="cs-p-stamina" style="width:75%"></div></div></div>
            <div class="chat-stat"><span class="chat-stat-lbl">THEM</span><span class="chat-stat-lbl">MRL</span><div class="chat-stat-track"><div class="chat-stat-fill morale" id="cs-w-morale" style="width:50%"></div></div></div>
            <div class="chat-stat"><span class="chat-stat-lbl"></span><span class="chat-stat-lbl">STM</span><div class="chat-stat-track"><div class="chat-stat-fill stamina" id="cs-w-stamina" style="width:50%"></div></div></div>
          </div>
        </div>
        <div class="llm-chat-messages" id="llm-chat-messages">
          <div class="chat-hint" id="llm-chat-hint">Say something to start a conversation...</div>
        </div>
        <div class="chat-social-actions" id="chat-social-actions"></div>
        <div class="llm-chat-input-row">
          <input type="text" id="llm-chat-input" class="llm-chat-input" placeholder="Type a message..." autocomplete="off" maxlength="500" />
          <button class="action-btn" data-action="send-chat" id="llm-send-btn" aria-label="Send message" style="padding:0.5rem 1rem;">Send</button>
        </div>
      </div>
    </div>
  `;

  // Click overlay background to close chat
  const bg = document.getElementById('llm-overlay-bg');
  if (bg) {
    bg.addEventListener('click', (e) => {
      if (e.target === bg && gameState) {
        closeLLMDialogue(gameState);
      }
    });
  }

  llmOverlayCreated = true;
  llmOverlayWalkerId = dlg.walkerId;
  renderedChatMsgCount = 0;
  llmStreamingShown = false;

  // Focus input
  const inp = document.getElementById('llm-chat-input') as HTMLInputElement;
  if (inp) inp.focus();
}

let cachedSocialActionsHtml = '';

function updateChatSocialActions(state: GameState, walkerId: number) {
  const el = document.getElementById('chat-social-actions');
  if (!el) return;
  const w = getWalkerState(state, walkerId);
  if (!w || !w.alive) { el.innerHTML = ''; cachedSocialActionsHtml = ''; return; }

  const p = state.player;
  const tier = getRelationshipTier(w);
  const mile = state.world.milesWalked;

  const foodDisabled = p.foodCooldown > 0;
  const waterDisabled = p.waterCooldown > 0;
  const storyDisabled = w.relationship < 10 || (mile - w.lastStoryMile) < 10;
  const encourageDisabled = (mile - w.lastEncourageMile) < 5;
  const walkTogetherAvail = w.relationship >= 30 && w.position === p.position;

  const isEnemy = w.isEnemy;

  // Alliance buttons
  const canProposeAlliance = !w.isAlliedWithPlayer && !w.isEnemy && w.relationship >= 40 && p.alliances.length < 2;
  const canProposeBond = w.isAlliedWithPlayer && !w.isBonded && w.relationship >= 85 && w.conversationCount >= 8 && p.bondedAlly === null;
  const canBreakAlliance = w.isAlliedWithPlayer && !w.isBonded;

  const html = `
    <div class="social-actions-row">
      <button class="social-btn" data-action="chat-share-food" ${foodDisabled ? 'disabled' : ''}><span class="si si-food">${ICON.food}</span>Food${foodDisabled ? ` (${Math.ceil(p.foodCooldown)}m)` : ''}</button>
      <button class="social-btn" data-action="chat-share-water" ${waterDisabled ? 'disabled' : ''}><span class="si si-water">${ICON.water}</span>Water${waterDisabled ? ` (${Math.ceil(p.waterCooldown)}m)` : ''}</button>
      <button class="social-btn" data-action="chat-tell-story" ${storyDisabled ? 'disabled' : ''}><span class="si si-story">${ICON.story}</span>Story</button>
      <button class="social-btn" data-action="chat-encourage" ${encourageDisabled ? 'disabled' : ''}><span class="si si-encourage">${ICON.encourage}</span>Encourage</button>
      ${walkTogetherAvail ? `<button class="social-btn ${w.walkingTogether ? 'active' : ''}" data-action="chat-walk-together"><span class="si si-walk">${ICON.walk}</span>${w.walkingTogether ? 'Walking \u2713' : 'Walk'}</button>` : ''}
      ${canProposeAlliance ? `<button class="social-btn alliance-btn" data-action="propose-alliance"><span class="si si-alliance">${ICON.alliance}</span>Alliance</button>` : ''}
      ${canProposeBond ? `<button class="social-btn bond-btn" data-action="propose-bond"><span class="si si-bond">${ICON.bond}</span>Bond</button>` : ''}
      ${canBreakAlliance ? `<button class="social-btn break-btn" data-action="break-alliance"><span class="si si-break">${ICON.breakIt}</span>Break</button>` : ''}
    </div>
    ${isEnemy ? `<div class="hostile-actions-row">
      <button class="hostile-btn" data-action="hostile-taunt">Taunt</button>
      <button class="hostile-btn" data-action="hostile-lullaby">Lullaby</button>
      <button class="hostile-btn" data-action="hostile-isolation" ${p.alliances.length === 0 ? 'disabled' : ''}>Isolate</button>
      <button class="hostile-btn" data-action="hostile-pace">Pace Pressure</button>
      <button class="hostile-btn" data-action="hostile-crowd">Crowd Turn</button>
      <button class="hostile-btn hostile-danger" data-action="hostile-trip" ${w.warnings >= 2 ? 'disabled' : ''}>Trip</button>
      <button class="hostile-btn hostile-danger" data-action="hostile-steal" ${w.warnings >= 2 ? 'disabled' : ''}>Steal Supplies</button>
    </div>` : ''}
  `;

  if (html !== cachedSocialActionsHtml) {
    el.innerHTML = html;
    cachedSocialActionsHtml = html;
  }
}

function updateLLMChatOverlay(state: GameState) {
  const container = document.getElementById('llm-chat-container');
  if (!container) return;

  // No dialogue → tear down overlay
  if (!state.llmDialogue) {
    if (llmOverlayCreated) {
      container.innerHTML = '';
      llmOverlayCreated = false;
      llmOverlayWalkerId = -1;
      renderedChatMsgCount = 0;
      llmStreamingShown = false;
    }
    return;
  }

  const dlg = state.llmDialogue;

  // Different walker or overlay not created → create fresh
  if (!llmOverlayCreated || llmOverlayWalkerId !== dlg.walkerId) {
    createLLMOverlay(container, dlg);
  }

  const msgsEl = document.getElementById('llm-chat-messages');
  if (!msgsEl) return;

  // Hide hint once we have messages or streaming
  const hint = document.getElementById('llm-chat-hint');
  if (hint) {
    hint.style.display = (dlg.messages.length === 0 && !dlg.isStreaming) ? '' : 'none';
  }

  // Append new messages (append-only — never rebuild)
  // Check if streaming element can be promoted to a permanent message
  let streamEl = msgsEl.querySelector('.streaming') as HTMLElement | null;

  while (renderedChatMsgCount < dlg.messages.length) {
    const m = dlg.messages[renderedChatMsgCount];

    // If this is a walker message and the streaming element exists,
    // promote it in-place (just remove the streaming class) — no flicker
    if (m.role === 'walker' && streamEl) {
      streamEl.classList.remove('streaming');
      const textEl = streamEl.querySelector('.chat-text');
      if (textEl) textEl.textContent = m.text;
      streamEl = null;
      llmStreamingShown = false;
    } else {
      const div = document.createElement('div');
      div.className = `chat-message chat-${m.role}`;
      const sender = document.createElement('span');
      sender.className = 'chat-sender';
      sender.textContent = m.role === 'player' ? 'You' : dlg.walkerName;
      const text = document.createElement('span');
      text.className = 'chat-text';
      text.textContent = m.text;
      div.appendChild(sender);
      div.appendChild(text);
      msgsEl.appendChild(div);
    }
    renderedChatMsgCount++;
  }

  // Manage streaming indicator
  streamEl = msgsEl.querySelector('.streaming') as HTMLElement | null;
  if (dlg.isStreaming) {
    if (!streamEl) {
      // Create streaming element
      streamEl = document.createElement('div');
      streamEl.className = 'chat-message chat-walker streaming';
      const sender = document.createElement('span');
      sender.className = 'chat-sender';
      sender.textContent = dlg.walkerName;
      const text = document.createElement('span');
      text.className = 'chat-text';
      text.textContent = dlg.streamBuffer || '...';
      streamEl.appendChild(sender);
      streamEl.appendChild(text);
      msgsEl.appendChild(streamEl);
      llmStreamingShown = true;
    } else {
      // Update streaming text
      const textEl = streamEl.querySelector('.chat-text');
      if (textEl) textEl.textContent = dlg.streamBuffer || '...';
    }
  } else if (streamEl) {
    // Streaming done but no message yet — remove stale indicator
    streamEl.remove();
    llmStreamingShown = false;
  }

  // Scroll to bottom only if user hasn't scrolled up (within 50px of bottom)
  const isNearBottom = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 50;
  if (isNearBottom) msgsEl.scrollTop = msgsEl.scrollHeight;

  // Update input/button disabled state directly (no rebuild)
  const inp = document.getElementById('llm-chat-input') as HTMLInputElement;
  const sendBtn = document.getElementById('llm-send-btn') as HTMLButtonElement;
  const wasDisabled = inp?.disabled;
  if (inp) inp.disabled = dlg.isStreaming;
  if (sendBtn) sendBtn.disabled = dlg.isStreaming;

  // Refocus input when streaming finishes (disabled → enabled transition)
  if (inp && wasDisabled && !dlg.isStreaming) inp.focus();

  // --- Targeted DOM updates for chat card elements ---
  const w = getWalkerState(state, dlg.walkerId);

  // Relationship gauge
  if (w) {
    const relLabel = getRelationshipTier(w);
    const relEl = document.getElementById('llm-rel-label');
    if (relEl && relEl.textContent !== relLabel) {
      relEl.textContent = relLabel;
      relEl.className = `walker-disposition ${relLabel}`;
    }
    const marker = document.getElementById('llm-rel-marker');
    if (marker) {
      const pct = ((w.relationship + 100) / 200) * 100;
      marker.style.left = `${pct}%`;
    }
    const trend = document.getElementById('llm-rel-trend');
    if (trend) {
      const arrow = w.relationship > chatOpenRelationship ? '\u2191'
        : w.relationship < chatOpenRelationship ? '\u2193' : '';
      if (trend.textContent !== arrow) trend.textContent = arrow;
    }
  }

  // Stat bars
  const pMorale = document.getElementById('cs-p-morale');
  const pStamina = document.getElementById('cs-p-stamina');
  const wMorale = document.getElementById('cs-w-morale');
  const wStamina = document.getElementById('cs-w-stamina');
  if (pMorale) pMorale.style.width = `${state.player.morale}%`;
  if (pStamina) pStamina.style.width = `${state.player.stamina}%`;
  if (w) {
    if (wMorale) wMorale.style.width = `${w.morale}%`;
    if (wStamina) wStamina.style.width = `${w.stamina}%`;
  }

  // Social action buttons
  updateChatSocialActions(state, dlg.walkerId);

  // "Stop the World" button state
  const pauseBtn = document.getElementById('llm-pause-btn');
  if (pauseBtn) {
    const label = state.isPaused ? '\u25B6 RESUME' : '\u25A0 STOP';
    if (pauseBtn.textContent !== label) {
      pauseBtn.textContent = label;
      pauseBtn.classList.toggle('active', state.isPaused);
    }
  }
}

// ============================================================
// GAME OVER SCREEN
// ============================================================

let lastEndingType: EndingType = null;

export function setEnding(ending: EndingType) {
  lastEndingType = ending;
}

function renderGameOver(state: GameState) {
  if (currentRenderedScreen === 'gameover') return;
  currentRenderedScreen = 'gameover';
  gameStructureCreated = false;

  const ending = lastEndingType || 'collapse';
  const { title, text, isVictory } = getEndingText(ending, state);
  const stats = getGameStats(state);

  const statsHtml = Object.entries(stats).map(([k, v]) =>
    `<div>${escapeHtml(k)}: <strong>${escapeHtml(v)}</strong></div>`
  ).join('');

  app.innerHTML = `
    <div class="screen-gameover">
      <div class="gameover-title ${isVictory ? 'victory' : 'defeat'}">${escapeHtml(title)}</div>
      <div class="gameover-text">${text.split('\n').map(l => `<p>${escapeHtml(l)}</p>`).join('')}</div>
      <div class="gameover-stats">${statsHtml}</div>
      <button class="btn-restart" data-action="restart">WALK AGAIN</button>
    </div>
  `;
}

// ============================================================
// HELPERS
// ============================================================

function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (el && el.textContent !== text) el.textContent = text;
}
