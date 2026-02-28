// ============================================================
// The Long Walk — Main Entry Point & Game Loop
// ============================================================

import './styles.css';
import { createInitialGameState, addNarrative } from './state';
import { gameTick, processPendingEliminations } from './engine';
import { checkScriptedEvents, checkHallucinations, checkOverheards, checkEnding, checkAbsenceEffects } from './narrative';
import { checkAmbientOverhear } from './overhear';
import { checkApproach } from './approach';
import { initUI, render, setEnding, closeWalkerPicker, closeDossier, handleSceneNext, handleSceneClose, closeLLMDialogue } from './ui';
import { closeDialogue } from './dialogue';
import { isServerAvailable } from './agentClient';
import { resolveCrisis } from './crises';
import { GameState } from './types';
import { getWalkerData } from './state';
import { getRouteSegment, getCrowdPhase } from './data/route';
import {
  initAudio, ensureResumed, startAmbientDrone, stopAmbientDrone,
  updateDroneIntensity, calculateIntensity,
  playGunshot, playWarningBuzzer, playWarningVoice, isAudioInitialized,
  playPleading, cancelSpeech,
  startCrowdNoise, updateCrowdNoise, stopCrowdNoise,
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
  const startAudio = async () => {
    if (!isAudioInitialized()) {
      initAudio();
      await ensureResumed(); // Resume context BEFORE creating audio nodes
      startAmbientDrone();
      startCrowdNoise();
      droneStarted = true;
      console.log('[Main] Audio initialized on user gesture');
      document.removeEventListener('click', startAudio);
      document.removeEventListener('keydown', startAudio);
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
let lastCheckedNarrativeIdx = 0; // Persistent — catches entries added between frames (e.g. pee/poop warnings)
let playerGunshotFired = false;

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
    // Force game speed to 1x during active crisis
    if (state.player.activeCrisis && state.gameSpeed > 1) {
      state.gameSpeed = 1;
    }

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

    // Trigger warning sounds for new narrative entries (persistent index catches inter-frame entries)
    for (let i = lastCheckedNarrativeIdx; i < state.narrativeLog.length; i++) {
      const entry = state.narrativeLog[i];
      if (entry.type === 'warning') {
        const match = entry.text.match(/"([^"]+)"/);
        if (match) {
          playWarningVoice(match[1]);
          // 30% chance of pleading after a 3rd/final warning
          if (match[1].includes('Final warning') && Math.random() < 0.3) {
            const numMatch = match[1].match(/warning,?\s*(\d+)/);
            const walkerAge = numMatch ? getWalkerData(state, Number(numMatch[1]))?.age : undefined;
            setTimeout(() => playPleading(walkerAge), 3500);
          }
        } else {
          playWarningBuzzer();
        }
      }
    }

    lastCheckedNarrativeIdx = state.narrativeLog.length;

    // Process delayed eliminations (2s after 3rd warning)
    // Gunshot fires at moment of elimination, cutting off any pleading
    const eliminated = processPendingEliminations(state);
    for (let g = 0; g < eliminated.length; g++) {
      setTimeout(() => {
        cancelSpeech(); // Cut off pleading
        playGunshot();
      }, g * 500);
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

      // Update crowd noise based on current route segment
      const routeSeg = getRouteSegment(state.world.milesWalked);
      const crowdPhase = getCrowdPhase(state.world.milesWalked);
      updateCrowdNoise(routeSeg.crowdDensity, crowdPhase.mood);
    }

    // Check for ending conditions
    const ending = checkEnding(state);
    if (ending) {
      setEnding(ending);
      state.screen = 'gameover';
    }
  }

  // Delayed gameover transition: show player death ticket first
  if (state.playerDeathTime > 0 && state.screen === 'game') {
    // Fire gunshot once, ~3.5s after death (lets warning voice finish)
    if (!playerGunshotFired) {
      playerGunshotFired = true;
      setTimeout(() => {
        cancelSpeech();
        playGunshot();
      }, 3500);
    }
    if (Date.now() - state.playerDeathTime > 6200) {
      state.screen = 'gameover';
    }
  }

  // Stop drone on game over
  if (state.screen === 'gameover' && droneStarted) {
    stopAmbientDrone();
    stopCrowdNoise();
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
      // Clear crisis DOM immediately (same pattern as click handler in ui.ts)
      const container = document.getElementById('crisis-container');
      if (container) container.innerHTML = '';
    }
    return;
  }

  switch (e.key) {
    case ' ':
    case 'p':
      e.preventDefault();
      state.isPaused = !state.isPaused;
      break;
    case '1': state.gameSpeed = 1; break;
    case '2': state.gameSpeed = 2; break;
    case '3': state.gameSpeed = 4; break;
    case '4': state.gameSpeed = 8; break;
    case 'ArrowUp':
      e.preventDefault();
      state.player.effort = Math.min(100, state.player.effort + 5);
      break;
    case 'ArrowDown':
      e.preventDefault();
      state.player.effort = Math.max(0, state.player.effort - 5);
      break;
    case 'Escape':
      e.preventDefault();
      // Dismiss overlays in priority order (topmost first)
      if (state.llmDialogue) {
        closeLLMDialogue(state);
      } else if (state.activeApproach) {
        state.activeApproach = null;
      } else if (closeDossier()) {
        // Dossier was open and closed
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
