# Session Handoff: Stable DOM, Generative Music, Game Feel

**Date:** 2026-02-26
**Session ID:** 2026-02-26-stable-dom-music-gamefeel
**Version:** 0.3.0
**Branch:** main

---

## Where We Are

The Long Walk is a survival simulation game (Vite + TypeScript client, Hono + OpenAI Agents server) where 99 walkers march a 400-mile death march. The player controls speed, position, and can talk to Tier 1/2 walkers via LLM-powered conversations (GPT-5.2).

As of v0.3.0, the core gameplay loop is functional: the player walks, manages stamina/hydration/hunger, talks to walkers via LLM agents, and watches the pack thin out over 400 miles. The bird's eye visualization shows all walkers as dots on the road with smooth position animation. The UI is now stable — all interactive panels (status, chat overlay) use a create-once pattern that keeps buttons responsive. Generative ambient music plays throughout with chord progressions, wind effects, and a walking-cadence pulse.

The game can be played at `http://localhost:5173` with `npm run dev` (client only) or `npm run dev:all` (client + agent server for LLM conversations).

## What Changed This Session

### Client — UI
- **Status panel refactored to stable DOM**: Previously rebuilt innerHTML every 200ms, destroying position buttons mid-click. Now creates panel structure once and updates via `getElementById` + `textContent`/`style` changes.
- **LLM chat overlay refactored to stable DOM**: Previously rebuilt innerHTML on every state change, breaking X button and causing flicker. Now creates overlay once, appends messages incrementally.
- **Streaming element promotion**: When a walker's LLM response finishes, the streaming indicator is promoted in-place (class removal) rather than removed and recreated — eliminates the last 1-frame flicker.
- **EQ-style speed meter**: Added above the speed slider with a dynamic green bar, white peak-hold indicator (rises instantly, falls slowly), red 4.0 mph danger line, and blue target speed triangle.
- **Escape key handling**: Moved from main.ts to ui.ts's event delegation for consistency.

### Client — Audio
- **Complete audio rewrite**: Replaced inaudible sub-bass drone (55 Hz, 0.12 gain) with generative ambient music system.
- **Chord progression**: 8 chords in A minor, crossfading every 8 seconds. Triangle + sine oscillators with low-pass filters for warmth.
- **Wind layer**: Filtered white noise that scales with game intensity.
- **Rhythmic pulse**: Footstep-like beat at 72 BPM (walking cadence).

### Client — Engine
- **Warning backstop fix**: NPCs past their elimination mile now gradually slow down (speed reduction scales with miles overdue). Hard backstop at +8 miles issues forced warnings with 5 game-minute minimum spacing and 3-minute adrenaline boost after.
- **Position transition system**: Changing position (front/middle/back) now boosts speed by 0.8 mph, costs 2 stamina, and triggers a smooth ease-in-out animation over ~2 game minutes on the visualization canvas.

### Client — Visualization
- **Smooth position animation**: Player dot interpolates between position bands using ease-in-out curve during transitions instead of teleporting.

### Server
- Minor import/streaming cleanup in agents.ts and index.ts.

### Docs
- CHANGELOG.md updated with v0.3.0 entry.

## Why These Changes Were Made

The user reported multiple gameplay issues during playtesting:
1. Position buttons (front/middle/back) flickered and were unclickable — root cause was innerHTML rebuild every 200ms.
2. Chat overlay X button didn't work and messages flickered — same innerHTML rebuild problem.
3. Music was either silent or "just a dull hum" — oscillators were sub-bass only.
4. Walkers were getting killed without proper warnings — backstop issued warnings every tick.
5. Position changes felt like teleporting — no physical feedback or animation.
6. Speed display wasn't dynamic enough — user wanted "EQ lights on a receiver" feel.

All fixes address direct user feedback from in-session playtesting.

## What Must Happen Next

1. **Playtest full game loop** — Start a game and play through to at least 20+ eliminations to verify warning pacing, music intensity scaling, and overall game feel.
2. **Tune music** — Add variety to the generative music (more chord voicings, optional percussion at high intensity). Test on multiple devices/speakers.
3. **Test LLM conversations** — Have sustained conversations with multiple Tier 1/2 walkers. Verify conversation history persistence, relationship changes, and tool effects.
4. **Consider walker-initiated conversations** — NPCs could approach the player under certain conditions (high relationship, dramatic moments).
5. **Mobile/tablet testing** — UI is desktop-focused; may need responsive adjustments.

## Decisions Made (Do Not Re-Debate)

| Decision | Rationale |
|----------|-----------|
| Stable DOM pattern for interactive panels | innerHTML rebuilds destroy buttons mid-click — create once, update targeted elements |
| Streaming element promotion (not remove+recreate) | Eliminates 1-frame flicker gap when response finishes |
| Generative chord-based music (not drones) | Sub-bass drones are inaudible on laptops; chord progressions sound like actual music |
| Position changes cost stamina + boost speed | Physical feel — moving through a crowd takes effort |
| Warning backstop uses gradual slowdown | Previous backstop killed walkers instantly without proper warning sequence |
| No fallback to scripted dialogue | LLM agents or nothing — core design principle |
| Tier 3 walkers have no dialogue | 75 background walkers are procedural only — LLM reserved for Tier 1 (9) and Tier 2 (15) |

## Explicitly Deferred

- **Persistent conversation history** — Agent conversations are in-memory only. Database storage deferred for simplicity.
- **Walker position drift** — NPC walkers don't move between front/middle/back during the march. Static positions.
- **Walker-initiated conversations** — Discussed but not implemented. NPCs don't approach the player yet.
- **Tier 3 dialogue** — By design, only Tier 1/2 have LLM agents. Tier 3 remain silent background walkers.

## Known Risks

- **OPENAI_API_KEY required** — Server won't start without it. No graceful degradation (by design).
- **gpt-5.2-chat-latest availability** — If OpenAI deprecates or renames this model, the server breaks.
- **In-memory conversation history** — All conversation state lost on server restart.
- **Web Audio cross-browser** — Generative music uses Web Audio API extensively. May sound different across browsers/devices.

## Key Files Modified

| File | Change |
|------|--------|
| `src/ui.ts` | Major refactor: status panel + chat overlay to stable DOM, speed meter, append-only chat |
| `src/styles.css` | Speed meter CSS (`.speed-meter`, `-bar`, `-peak`, `-danger`, `-target`) |
| `src/main.ts` | Removed LLM Escape handling (moved to ui.ts) |
| `src/audio.ts` | **New file** — Generative ambient music system |
| `src/state.ts` | Audio state initialization |
| `src/types.ts` | Audio-related type additions |
| `src/engine.ts` | Warning backstop fix, position transition system |
| `src/visualization.ts` | Smooth position animation with ease-in-out interpolation |
| `server/agents.ts` | Import/streaming cleanup |
| `server/index.ts` | Import/streaming cleanup |
| `docs/CHANGELOG.md` | v0.3.0 entry |
