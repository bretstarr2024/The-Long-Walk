// ============================================================
// The Long Walk — UI Renderer (Event Delegation + Cached Updates)
// ============================================================

import { GameState, PlayerState, WalkerState, PackPosition, Reason } from './types';
import { getNearbyWalkers, getWalkerData, getWalkersRemaining, addNarrative } from './state';
import { setPlayerSpeed, setPlayerPosition, requestFood, requestWater, formAlliance } from './engine';
import { getAvailableDialogues, startDialogue, selectDialogueOption, closeDialogue, getContextualLine, checkNPCDialogue } from './dialogue';
import { getEndingText, getGameStats, EndingType } from './narrative';
import { getRouteSegment } from './data/route';
import { initVisualization, updateVisualization } from './visualization';
import { sendMessage, isServerAvailable, type WalkerProfile, type GameContextForAgent } from './agentClient';

let app: HTMLElement;
let currentRenderedScreen: string = '';
let gameState: GameState | null = null;

// Track narrative entries we've already rendered
let renderedNarrativeCount = 0;

// Cache panel HTML to prevent unnecessary DOM rebuilds (fixes blinking)
let cachedStatusHtml = '';
let cachedWalkersHtml = '';
let cachedActionsHtml = '';
let cachedControlsHtml = '';
let cachedDialogueHtml = '';
let cachedLlmChatHtml = '';
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
    if (target.id === 'speed-slider') {
      setPlayerSpeed(gameState, parseInt(target.value) / 10);
    }
  });

  // Keyboard shortcuts within game UI
  app.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!gameState) return;
    const target = e.target as HTMLElement;
    if (target.id === 'llm-chat-input' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat(gameState);
    }
    if (e.key === 'Escape' && walkerPickerOpen) {
      walkerPickerOpen = false;
      cachedActionsHtml = '';
    }
  });
}

function handleAction(action: string, state: GameState) {
  switch (action) {
    case 'start': state.screen = 'creation'; currentRenderedScreen = ''; break;
    case 'intro-next': advanceIntro(state); break;
    case 'restart': window.location.reload(); break;
    case 'speed-down': setPlayerSpeed(state, state.player.targetSpeed - 0.2); break;
    case 'speed-up': setPlayerSpeed(state, state.player.targetSpeed + 0.2); break;
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
    case 'speed-1': state.gameSpeed = 1; break;
    case 'speed-2': state.gameSpeed = 2; break;
    case 'speed-4': state.gameSpeed = 4; break;
    case 'speed-8': state.gameSpeed = 8; break;
  }
}

function changePosition(state: GameState, pos: PackPosition) {
  if (state.player.position === pos) return;
  const prev = state.player.position;
  setPlayerPosition(state, pos);
  walkerPickerOpen = false;
  cachedStatusHtml = '';
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
  const w = state.walkers.find(ws => ws.walkerNumber === walkerNumber);
  if (!w || !w.alive) return;

  const data = getWalkerData(state, walkerNumber);
  if (!data) return;

  // Alliance check
  if (w.relationship >= 60 && !w.isAlliedWithPlayer && state.player.alliances.length < 2) {
    formAlliance(state, walkerNumber);
    return;
  }

  // Tier 1/2 + server online → LLM chat
  if (state.llmAvailable && data.tier <= 2 && !state.llmDialogue) {
    state.llmDialogue = {
      walkerId: walkerNumber,
      walkerName: data.name,
      messages: [],
      isStreaming: false,
      streamBuffer: '',
    };
    cachedLlmChatHtml = '';
    console.log('[Talk] LLM chat opened with', data.name, '#' + walkerNumber);
    return;
  }

  // Tier 3 or server offline → contextual line
  const line = getContextualLine(state, w);
  if (line) {
    addNarrative(state, `${data.name}: ${line}`, 'dialogue');
    w.relationship = Math.min(100, w.relationship + 1);
  }
}

export function closeWalkerPicker() {
  if (walkerPickerOpen) {
    walkerPickerOpen = false;
    cachedActionsHtml = '';
  }
}

function closeLLMDialogue(state: GameState) {
  if (!state.llmDialogue) return;
  const name = state.llmDialogue.walkerName;
  state.llmDialogue = null;
  cachedLlmChatHtml = '';
  addNarrative(state, `You stop talking to ${name} and focus on walking.`, 'narration');
}

function buildGameContext(state: GameState, walkerNum: number): GameContextForAgent {
  const w = state.walkers.find(ws => ws.walkerNumber === walkerNum)!;
  const remaining = getWalkersRemaining(state);
  const recentEvents = state.narrativeLog
    .slice(-10)
    .filter(e => e.type === 'elimination' || e.type === 'event' || e.type === 'warning')
    .map(e => e.text);

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
  cachedLlmChatHtml = ''; // force re-render

  const walkerProfile = buildWalkerProfile(state, dlg.walkerId);
  const gameCtx = buildGameContext(state, dlg.walkerId);

  try {
    for await (const event of sendMessage(dlg.walkerId, message, walkerProfile, gameCtx)) {
      if (!state.llmDialogue) break; // Chat was closed during streaming

      switch (event.type) {
        case 'token':
          dlg.streamBuffer += event.text;
          cachedLlmChatHtml = ''; // force re-render for streaming text
          break;

        case 'effect':
          applyGameEffect(state, event);
          break;

        case 'done':
          dlg.messages.push({ role: 'walker', text: dlg.streamBuffer || event.text });
          dlg.streamBuffer = '';
          dlg.isStreaming = false;
          cachedLlmChatHtml = '';
          // Add to narrative log
          addNarrative(state, `${dlg.walkerName}: ${event.text}`, 'dialogue');
          break;

        case 'error':
          dlg.isStreaming = false;
          dlg.messages.push({ role: 'walker', text: `[Connection lost: ${event.error}]` });
          cachedLlmChatHtml = '';
          break;
      }
    }
  } catch (err: any) {
    if (state.llmDialogue) {
      dlg.isStreaming = false;
      dlg.messages.push({ role: 'walker', text: `[Error: ${err.message || 'Connection failed'}]` });
      cachedLlmChatHtml = '';
    }
  }
}

function applyGameEffect(state: GameState, effect: { effectType: string; walkerId?: number; delta?: number; key?: string; value?: boolean; text?: string }) {
  const w = state.llmDialogue ? state.walkers.find(ws => ws.walkerNumber === state.llmDialogue!.walkerId) : null;

  switch (effect.effectType) {
    case 'relationship':
      if (w && effect.delta) {
        w.relationship = Math.max(-100, Math.min(100, w.relationship + effect.delta));
        console.log(`[Effect] Relationship ${effect.delta > 0 ? '+' : ''}${effect.delta} → ${w.relationship}`);
      }
      break;
    case 'morale':
      if (effect.delta) {
        state.player.morale = Math.max(0, Math.min(100, state.player.morale + effect.delta));
        console.log(`[Effect] Morale ${effect.delta > 0 ? '+' : ''}${effect.delta} → ${state.player.morale}`);
      }
      break;
    case 'flag':
      if (effect.key) {
        state.player.flags[effect.key] = effect.value ?? true;
        console.log(`[Effect] Flag "${effect.key}" = ${effect.value}`);
      }
      break;
    case 'info':
      if (effect.text) {
        addNarrative(state, effect.text, 'narration');
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
  const prize = state.player.prize;
  const thoughts = [
    `${prize}. That's why you're here. That's why you keep walking.`,
    `You think about ${prize}. The image is clear for a moment, then blurs. Keep walking.`,
    `${prize}. Is it worth this? It has to be. It has to be.`,
    `Remember: ${prize}. That's the reason. Don't lose the reason.`,
  ];
  addNarrative(state, thoughts[Math.floor(Math.random() * thoughts.length)], 'thought');
  const boost = Math.max(1, 5 - Math.floor(state.world.milesWalked / 80));
  state.player.morale = Math.min(100, state.player.morale + boost);
}

function handleWalkerClick(state: GameState, num: number) {
  // Clicking a walker in the nearby list acts the same as picking them from the Talk menu
  console.log('[Walker Click]', num);
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
<p>You are Walker #100. ${s.player.name}, from New Columbia. The 51st state. Nobody here knows where that is. Nobody here knows you.</p>`,

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
<p style="margin-top: 2rem; color: var(--text-dim);">Your Prize: <em>${s.player.prize}</em>. Remember why you're here.</p>`,
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
  // Check for NPC-initiated dialogue
  if (!state.activeDialogue && !state.isPaused) {
    const nodeId = checkNPCDialogue(state);
    if (nodeId) startDialogue(state, nodeId);
  }

  if (!gameStructureCreated) {
    createGameStructure();
    gameStructureCreated = true;
    currentRenderedScreen = 'game';
    // Reset caches so first update always applies
    cachedStatusHtml = '';
    cachedWalkersHtml = '';
    cachedActionsHtml = '';
    cachedControlsHtml = '';
    cachedDialogueHtml = '';
  }

  updateHeader(state);
  updateNarrativeLog(state);
  updateStatusPanel(state);
  updateWalkersPanel(state);
  updateActionsPanel(state);
  updateGameControls(state);
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
          <canvas id="viz-canvas" width="200" height="500"></canvas>
        </div>
        <div class="narrative-panel" id="narrative-panel"></div>
      </div>
      <div class="game-bottom">
        <div class="status-panel" id="status-panel"></div>
        <div class="walkers-panel" id="walkers-panel"></div>
        <div class="actions-panel" id="actions-panel"></div>
      </div>
      <div class="game-controls" id="game-controls"></div>
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
      div.innerHTML = `<span class="mile-marker">[${e.mile.toFixed(1)}]</span> ${e.text}`;
      fragment.appendChild(div);
    }
    panel.appendChild(fragment);
    renderedNarrativeCount = entries.length;
    panel.scrollTop = panel.scrollHeight;
  }
}

// --- Status panel: cached innerHTML (only rebuilds when values change) ---
function updateStatusPanel(state: GameState) {
  const el = document.getElementById('status-panel');
  if (!el) return;

  const p = state.player;
  const w = state.world;

  const html = `
    <div class="panel-title">STATUS — ${p.name.toUpperCase()} #100</div>
    <div class="stat-row">
      <span class="stat-label">Speed</span>
      <span class="stat-value" style="color: ${p.speed < 4 ? 'var(--accent-red)' : p.speed < 4.3 ? 'var(--accent-amber)' : 'var(--text-primary)'}">${p.speed.toFixed(1)} mph</span>
    </div>
    <div class="speed-control">
      <button class="speed-btn" data-action="speed-down">◀</button>
      <input type="range" min="0" max="70" value="${Math.round(p.targetSpeed * 10)}" id="speed-slider" style="flex:1; accent-color: ${p.targetSpeed < 4 ? 'var(--accent-red)' : 'var(--accent-blue)'};" />
      <button class="speed-btn" data-action="speed-up">▶</button>
      <span class="speed-display ${p.targetSpeed < 4 ? 'danger' : ''}">${p.targetSpeed.toFixed(1)}</span>
    </div>
    <div class="warning-display">
      ${[0, 1, 2].map(i => `<div class="warning-pip ${i < p.warnings ? 'active' : ''}">${i < p.warnings ? '!' : ''}</div>`).join('')}
      ${p.warnings > 0 ? `<span style="font-size:0.6rem;color:var(--text-dim);margin-left:0.5rem;">walk-off: ${Math.max(0, 60 - p.warningTimer).toFixed(0)}m</span>` : ''}
    </div>
    ${statBar('STA', p.stamina)}
    ${statBar('HYD', p.hydration)}
    ${statBar('HUN', p.hunger)}
    ${statBar('PAI', p.pain, true)}
    ${statBar('MOR', p.morale)}
    ${statBar('CLR', p.clarity)}
    <div class="env-info">
      <div>Weather: ${w.weather.replace('_', ' ')}</div>
      <div>Terrain: ${w.terrain}</div>
      <div>Crowd: ${w.crowdMood}</div>
      <div>Act: ${w.currentAct} | Horror: T${w.horrorTier}</div>
    </div>
    <div style="margin-top:0.5rem;">
      <div class="panel-title">POSITION</div>
      <div style="display:flex;gap:0.3rem;">
        ${(['front', 'middle', 'back'] as PackPosition[]).map(pos =>
          `<button class="speed-btn" style="flex:1;font-size:0.6rem;${p.position === pos ? 'border-color:var(--accent-blue);color:var(--accent-blue);' : ''}" data-action="pos-${pos}">${pos}</button>`
        ).join('')}
      </div>
    </div>
  `;

  if (html !== cachedStatusHtml) {
    el.innerHTML = html;
    cachedStatusHtml = html;
  }
}

function statBar(label: string, value: number, inverted = false): string {
  const pct = Math.max(0, Math.min(100, value));
  const colorClass = inverted
    ? (pct > 70 ? 'danger' : pct > 40 ? 'caution' : 'good')
    : (pct > 60 ? 'good' : pct > 30 ? 'caution' : 'danger');
  return `
    <div class="stat-row">
      <span class="stat-label" style="width:28px">${label}</span>
      <div class="stat-bar"><div class="stat-bar-fill ${colorClass}" style="width:${pct}%"></div></div>
      <span class="stat-value" style="width:24px;text-align:right;font-size:0.7rem;">${Math.round(pct)}</span>
    </div>
  `;
}

// --- Walkers panel: cached ---
function updateWalkersPanel(state: GameState) {
  const el = document.getElementById('walkers-panel');
  if (!el) return;

  const nearby = getNearbyWalkers(state);
  const items = nearby.map(w => {
    const data = getWalkerData(state, w.walkerNumber);
    if (!data) return '';
    const dispLabel = w.isAlliedWithPlayer ? 'ally'
      : w.relationship > 40 ? 'friendly'
      : w.relationship > 10 ? 'curious'
      : w.relationship < -10 ? 'hostile'
      : w.behavioralState === 'struggling' ? 'struggling'
      : 'neutral';
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
    <div class="panel-title">NEARBY WALKERS (${state.player.position})</div>
    ${items || '<div style="color:var(--text-dim);font-size:0.75rem;padding:0.5rem;">No walkers nearby.</div>'}
  `;

  if (html !== cachedWalkersHtml) {
    el.innerHTML = html;
    cachedWalkersHtml = html;
  }
}

// --- Actions panel: cached ---
function updateActionsPanel(state: GameState) {
  const el = document.getElementById('actions-panel');
  if (!el) return;

  const p = state.player;
  const nearby = getNearbyWalkers(state);
  const foodDisabled = p.foodCooldown > 0;
  const waterDisabled = p.waterCooldown > 0;
  const talkDisabled = nearby.length === 0;

  // Close picker if LLM dialogue opened
  if (state.llmDialogue) walkerPickerOpen = false;

  let pickerHtml = '';
  if (walkerPickerOpen && nearby.length > 0) {
    const items = nearby.map(w => {
      const d = getWalkerData(state, w.walkerNumber);
      if (!d) return '';
      const rel = w.relationship > 40 ? 'friendly'
        : w.relationship > 10 ? 'curious'
        : w.relationship < -10 ? 'hostile'
        : 'neutral';
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

  const html = `
    <div class="panel-title">ACTIONS</div>
    <button class="action-btn ${walkerPickerOpen ? 'active' : ''}" data-action="talk" ${talkDisabled ? 'disabled' : ''}>Talk</button>
    ${pickerHtml}
    <button class="action-btn" data-action="food" ${foodDisabled ? 'disabled' : ''}>
      Request Food ${foodDisabled ? `(${Math.ceil(p.foodCooldown)}m)` : ''}
    </button>
    <button class="action-btn" data-action="water" ${waterDisabled ? 'disabled' : ''}>
      Request Water ${waterDisabled ? `(${Math.ceil(p.waterCooldown)}m)` : ''}
    </button>
    <button class="action-btn" data-action="observe">Look Around</button>
    <button class="action-btn" data-action="think">Think About Prize</button>
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

  const html = `
    ${[1, 2, 4, 8].map(s =>
      `<button class="game-speed-btn ${state.gameSpeed === s ? 'active' : ''}" data-action="speed-${s}">${s}x</button>`
    ).join('')}
    <button class="pause-btn ${state.isPaused ? 'paused' : ''}" data-action="pause">${state.isPaused ? 'PAUSED' : 'PAUSE'}</button>
  `;

  if (html !== cachedControlsHtml) {
    el.innerHTML = html;
    cachedControlsHtml = html;
  }
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
  const w = state.walkers.find(ws => ws.walkerNumber === d.walkerNumber);
  const relLabel = !w ? '' : w.relationship > 40 ? '+++' : w.relationship > 20 ? '++' : w.relationship > 0 ? '+' : w.relationship > -20 ? '-' : '--';

  const optionsHtml = d.options.map((opt, i) =>
    `<button class="dialogue-option" data-option="${i}">${opt.text}</button>`
  ).join('');

  const html = `
    <div class="dialogue-overlay">
      <div class="dialogue-box">
        <div class="dialogue-speaker">${d.walkerName} (#${d.walkerNumber}) — ${relLabel}</div>
        <div class="dialogue-text">${d.text}</div>
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

// --- LLM Chat overlay ---
function updateLLMChatOverlay(state: GameState) {
  const container = document.getElementById('llm-chat-container');
  if (!container) return;

  if (!state.llmDialogue) {
    if (cachedLlmChatHtml !== '') {
      container.innerHTML = '';
      cachedLlmChatHtml = '';
    }
    return;
  }

  const dlg = state.llmDialogue;
  const w = state.walkers.find(ws => ws.walkerNumber === dlg.walkerId);
  const relLabel = !w ? '' : w.relationship > 40 ? 'friendly' : w.relationship > 10 ? 'curious' : w.relationship < -10 ? 'hostile' : 'neutral';

  const messagesHtml = dlg.messages.map(m =>
    `<div class="chat-message chat-${m.role}">
      <span class="chat-sender">${m.role === 'player' ? 'You' : dlg.walkerName}</span>
      <span class="chat-text">${m.text}</span>
    </div>`
  ).join('');

  const streamingHtml = dlg.isStreaming && dlg.streamBuffer
    ? `<div class="chat-message chat-walker streaming">
        <span class="chat-sender">${dlg.walkerName}</span>
        <span class="chat-text">${dlg.streamBuffer}</span>
      </div>`
    : dlg.isStreaming
    ? `<div class="chat-message chat-walker streaming">
        <span class="chat-sender">${dlg.walkerName}</span>
        <span class="chat-text"><span class="typing-dots">...</span></span>
      </div>`
    : '';

  const html = `
    <div class="dialogue-overlay">
      <div class="llm-chat-box">
        <div class="llm-chat-header">
          <div>
            <span class="dialogue-speaker">${dlg.walkerName} (#${dlg.walkerId})</span>
            <span class="walker-disposition ${relLabel}" style="margin-left:0.5rem;">${relLabel}</span>
          </div>
          <button class="speed-btn" data-action="close-chat" style="font-size:0.8rem;width:auto;padding:0.2rem 0.5rem;">X</button>
        </div>
        <div class="llm-chat-messages" id="llm-chat-messages">
          ${dlg.messages.length === 0 && !dlg.isStreaming
            ? '<div class="chat-hint">Say something to start a conversation...</div>'
            : ''}
          ${messagesHtml}
          ${streamingHtml}
        </div>
        <div class="llm-chat-input-row">
          <input type="text" id="llm-chat-input" class="llm-chat-input" placeholder="Type a message..." autocomplete="off" ${dlg.isStreaming ? 'disabled' : ''} />
          <button class="action-btn" data-action="send-chat" ${dlg.isStreaming ? 'disabled' : ''} style="padding:0.5rem 1rem;">Send</button>
        </div>
      </div>
    </div>
  `;

  if (html !== cachedLlmChatHtml) {
    container.innerHTML = html;
    cachedLlmChatHtml = html;

    // Auto-scroll messages
    const msgsEl = document.getElementById('llm-chat-messages');
    if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;

    // Focus input
    if (!dlg.isStreaming) {
      const inp = document.getElementById('llm-chat-input') as HTMLInputElement;
      if (inp) inp.focus();
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
    `<div>${k}: <strong>${v}</strong></div>`
  ).join('');

  app.innerHTML = `
    <div class="screen-gameover">
      <div class="gameover-title ${isVictory ? 'victory' : 'defeat'}">${title}</div>
      <div class="gameover-text">${text.split('\n').map(l => `<p>${l}</p>`).join('')}</div>
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
