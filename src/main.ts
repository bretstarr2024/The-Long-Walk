// ============================================================
// The Long Walk — Main Entry Point & Game Loop
// ============================================================

import './styles.css';
import { createInitialGameState, addNarrative } from './state';
import { gameTick } from './engine';
import { checkScriptedEvents, checkHallucinations, checkOverheards, checkEnding, checkAbsenceEffects } from './narrative';
import { checkAmbientOverhear } from './overhear';
import { checkApproach } from './approach';
import { initUI, render, setEnding, closeWalkerPicker, handleSceneNext, handleSceneClose, closeLLMDialogue } from './ui';
import { closeDialogue } from './dialogue';
import { isServerAvailable } from './agentClient';
import { resolveCrisis } from './crises';
import { GameState } from './types';
import {
  initAudio, ensureResumed, startAmbientDrone, stopAmbientDrone,
  updateDroneIntensity, calculateIntensity,
  playGunshot, playWarningBuzzer, isAudioInitialized,
} from './audio';

// ============================================================
// INITIALIZATION
// ============================================================

let state: GameState;

async function init() {
  state = createInitialGameState();
  initUI();
  render(state);
  state.lastTickTime = performance.now();
  requestAnimationFrame(gameLoop);

  // Initialize audio on first user interaction (browser autoplay policy)
  const startAudio = () => {
    if (!isAudioInitialized()) {
      initAudio();
      console.log('[Main] Audio initialized on user gesture');
    }
    ensureResumed();
  };
  document.addEventListener('click', startAudio, { once: false });
  document.addEventListener('keydown', startAudio, { once: false });

  // Check LLM server availability
  const available = await isServerAvailable();
  state.llmAvailable = available;
  console.log(`[Main] LLM server ${available ? 'ONLINE' : 'OFFLINE'}`);

  // Periodic health check every 30s
  setInterval(async () => {
    state.llmAvailable = await isServerAvailable();
  }, 30000);
}

// ============================================================
// GAME LOOP — requestAnimationFrame
// ============================================================

let lastRenderTime = 0;
const RENDER_INTERVAL = 200; // Render game screen ~5 FPS (sub-panels rebuild)
let droneStarted = false;

function gameLoop(timestamp: number) {
  const deltaMs = timestamp - state.lastTickTime;
  state.lastTickTime = timestamp;

  // Cap delta to prevent huge jumps (e.g. tab was backgrounded)
  const cappedDelta = Math.min(deltaMs, 200);

  // Enforce pause while scene is active
  if (state.activeScene && !state.isPaused) {
    state.isPaused = true;
  }

  if (state.screen === 'game' && !state.isPaused && state.player.alive) {
    // Start ambient drone when game begins
    if (!droneStarted && isAudioInitialized()) {
      startAmbientDrone();
      droneStarted = true;
    }

    // Force game speed to 1x during active crisis
    if (state.player.activeCrisis && state.gameSpeed > 1) {
      state.gameSpeed = 1;
    }

    // Snapshot narrative count before tick to detect new events
    const prevNarrativeCount = state.narrativeLog.length;

    // Run game systems every frame for smooth simulation
    gameTick(state, cappedDelta);

    // Check scripted events (may trigger scene overlay which pauses)
    checkScriptedEvents(state);

    // Check overheard conversations (scripted)
    checkOverheards(state);

    // Check ambient LLM overheards
    checkAmbientOverhear(state);

    // Check hallucinations
    checkHallucinations(state);

    // Check absence effects (ghost references for dead Tier 1 walkers)
    checkAbsenceEffects(state);

    // Check NPC approaches (they come to you)
    checkApproach(state);

    // Trigger sounds for new narrative entries
    for (let i = prevNarrativeCount; i < state.narrativeLog.length; i++) {
      const entry = state.narrativeLog[i];
      if (entry.type === 'elimination') playGunshot();
      else if (entry.type === 'warning') playWarningBuzzer();
    }

    // Update drone intensity based on game state
    if (droneStarted) {
      const intensity = calculateIntensity(
        state.world.hoursElapsed,
        state.eliminationCount,
        state.world.horrorTier,
        state.world.isNight,
      );
      updateDroneIntensity(intensity);
    }

    // Check for ending conditions
    const ending = checkEnding(state);
    if (ending) {
      setEnding(ending);
      state.screen = 'gameover';
    }
  }

  // Stop drone on game over
  if (state.screen === 'gameover' && droneStarted) {
    stopAmbientDrone();
    droneStarted = false;
  }

  // Throttle rendering for game screen (sub-panels rebuild their innerHTML)
  // Non-game screens render immediately (they guard with currentRenderedScreen)
  if (state.screen !== 'game' || timestamp - lastRenderTime >= RENDER_INTERVAL) {
    render(state);
    lastRenderTime = timestamp;
  }

  // Continue loop
  requestAnimationFrame(gameLoop);
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener('keydown', (e) => {
  if (state.screen !== 'game') return;

  // Don't capture shortcuts when typing in an input field (but always allow Escape)
  const tag = (document.activeElement as HTMLElement)?.tagName;
  if ((tag === 'INPUT' || tag === 'TEXTAREA') && e.key !== 'Escape') return;

  // During active scene: Space/Enter advance, Escape closes
  if (state.activeScene) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (state.activeScene.currentPanel < state.activeScene.panels.length - 1) {
        handleSceneNext(state);
      } else {
        handleSceneClose(state);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleSceneClose(state);
      return;
    }
    return; // Swallow all other keys during scene
  }

  // During active crisis: keys 1-4 select crisis options
  const crisis = state.player.activeCrisis;
  if (crisis && e.key >= '1' && e.key <= '4') {
    e.preventDefault();
    const idx = parseInt(e.key) - 1;
    if (idx < crisis.options.length) {
      resolveCrisis(state, crisis.options[idx].id);
    }
    return;
  }

  switch (e.key) {
    case ' ':
      e.preventDefault();
      state.isPaused = !state.isPaused;
      break;
    case '1': state.gameSpeed = 1; break;
    case '2': state.gameSpeed = 2; break;
    case '3': state.gameSpeed = 4; break;
    case '4': state.gameSpeed = 8; break;
    case 'ArrowUp':
      e.preventDefault();
      state.player.targetSpeed = Math.min(7, state.player.targetSpeed + 0.2);
      break;
    case 'ArrowDown':
      e.preventDefault();
      state.player.targetSpeed = Math.max(0, state.player.targetSpeed - 0.2);
      break;
    case 'Escape':
      e.preventDefault();
      // Dismiss overlays in priority order (topmost first)
      if (state.llmDialogue) {
        closeLLMDialogue(state);
      } else if (state.activeApproach) {
        state.activeApproach = null;
      } else if (state.activeDialogue) {
        closeDialogue(state);
      } else {
        closeWalkerPicker();
      }
      break;
  }
});

// ============================================================
// START
// ============================================================

document.addEventListener('DOMContentLoaded', init);
