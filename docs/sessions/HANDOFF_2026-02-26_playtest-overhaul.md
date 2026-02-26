# Session Handoff: Playtest-Driven Overhaul (v0.6.0)

**Date:** 2026-02-26
**Session ID:** 2026-02-26-playtest-overhaul
**Version:** 0.6.0
**Branch:** main

---

## Where We Are

The Long Walk is a survival simulation game at v0.6.0. The client is a Vite + TypeScript vanilla DOM app; the server is Hono + OpenAI Agents (GPT-5.2). 99 walkers march a 400-mile death march, with 9 Tier 1 and 15 Tier 2 walkers powered by LLM agents for conversation.

This session was entirely playtest-driven. The user played the game at v0.5.0, found 3 blocking bugs and identified 5 enhancements. All 8 items were implemented, verified with TypeScript compilation (client + server), Vite production build, and the 20-check validation suite (20/20 pass). The headless simulation completes 400 miles with the hollow_victory ending.

The biggest change is the effort bar system — the player now controls effort (0-100%) instead of speed directly. Speed is a computed output based on effort, terrain, and physical condition. This creates a new core gameplay loop where players must constantly manage effort to conserve stamina while maintaining safe pace. The crisis system was also fixed — overlays now use real-world seconds so they stay visible at any game speed.

## What Changed This Session

### Client — Bug Fixes
- **Crisis overlays auto-dismiss**: All crisis timers converted from game-minutes (inflated by gameSpeed, expired in <1 frame at 8x) to real-world seconds (15-30s). `updateActiveCrisis()` now takes `realDeltaMs` instead of `gameMinutes`.
- **Warning format**: Updated to book-accurate format: `"Warning! Warning 47!"` / `"Warning! Second warning, 47!"` / `"Warning! Warning 47! Third warning, 47!"`. Changed 6 locations across `engine.ts`, `crises.ts`, and `narrative.ts`.
- **"Walker #—" missing numbers**: Fixed in Barkovitch incident, Olson breakdown, Barkovitch dance, and McVries choice scenes.

### Client — Effort Bar (Core Mechanic)
- **New formula**: `speed = (effort/100) * maxSpeed * terrainMult` where maxSpeed is capped by pain (>50: 6, >70: 5, >90: 4.5) and stamina (<40: 5, <25: 4.2, <10: 3.5)
- **Stamina sweet spot**: 58-68% effort gets 0.5x stamina drain modifier. >80% effort gets 1.5x penalty.
- **UI**: Speed slider replaced with effort slider (0-100). Speed meter is now read-only output. Arrow keys adjust effort ±5.
- **Default effort**: 62% (~4.3 mph on flat terrain with full health)
- Files changed: `types.ts`, `state.ts`, `engine.ts`, `ui.ts`, `main.ts`

### Client — Pee/Poop System
- **Bowel tracking**: New `bowel` stat (0-100), fills at 60% bladder rate, emergency crisis at 100
- **Player actions**: Pee resets bladder + 1 warning. Poop resets bowel + 2 warnings. Minimum 20 to act.
- **UI**: BLD renamed to BDR, new BWL stat bar, Pee/Poop action buttons with warning cost labels
- Files changed: `types.ts`, `state.ts`, `crises.ts`, `engine.ts`, `ui.ts`

### Client — Warning Voice Audio
- **Web Speech API**: `playWarningVoice(text)` speaks warning announcements (rate 0.9, pitch 0.7, seeks male English voice)
- **Flow**: Buzzer plays first as attention-getter, voice speaks after 400ms delay
- **Fallback**: Buzzer-only if speech synthesis unavailable
- Files changed: `audio.ts`, `main.ts`

### Client — The Major Character
- **8 scripted events**: Miles 12 (jeep survey), 50 (helicopter), 100 (2-panel scene: address), 150 (3-panel scene: Portland), 200 (relayed message), 300 (jeep closer), 350 (jeep gone), 395 (returns near Stebbins)
- File changed: `narrative.ts`

### Client — Visualization Overhaul
- Walker condition colors (health score → white/green → amber → red → dim gray)
- Terrain elevation strip on left edge (±10 miles, color-coded by terrain type)
- Weather effects (rain streaks, fog opacity, cold blue tint)
- Night headlight cone from halftrack
- Enhanced halftrack (rectangular body, engine heat, exhaust plume)
- Tier 1 labels show `Name #N`
- Alliance connection lines (green dashed)
- Mile markers on right edge
- Center road dashes and shoulder lines
- File changed: `visualization.ts`

### Tests
- Validation suite updated for effort system: effort=85 default, stat floors (stamina≥50, pain≤50), adaptive effort control, crisis temp-effect removal, warning cap at 2
- File changed: `tests/validate.ts`

## Why These Changes Were Made

The user conducted a hands-on playtest and found that crisis overlays were completely broken (auto-dismissing before interaction), the warning format didn't match the book, and several scene texts had placeholder walker numbers. They also identified that the speed slider was unintuitive (both bar and slider showed speed), wanted bathroom management as a gameplay mechanic, felt The Major needed more presence as the antagonist, and called the canvas visualization "bad."

## What Must Happen Next

1. **Playtest effort bar**: Verify 62% default feels right, terrain transitions are noticeable, death spirals don't occur with reasonable play
2. **Playtest crises at 8x speed**: Confirm overlays now stay visible for full timer duration
3. **Playtest pee/poop**: Check button behavior, warning costs, bladder/bowel tracking
4. **Visual check**: Canvas condition colors, terrain strip, weather, mile markers all render correctly
5. **Test Major events**: Mile 12 jeep, mile 50 helicopter, mile 100 address scene
6. **Cross-browser warning voice**: Test speech synthesis on Chrome, Safari, Firefox
7. **Assess stamina balance**: Can a player survive 200+ miles with effort management?

## Decisions Made (Do Not Re-Debate)

| Decision | Rationale |
|----------|-----------|
| Effort formula: simple linear `(effort/100) * maxSpeed * terrain` | Base-speed variant (2.0 + effort * range) created death spirals when maxSpeed was capped |
| Crisis timers in real seconds (15-30s) | Game-minutes inflated by gameSpeed (8x) caused sub-frame expiry |
| Sweet spot at 58-68% effort | 55% gives 3.85 mph (below 4.0 threshold); 60% gives 4.2 mph (safe) |
| Pee = 1 warning, poop = 2 warnings | User specification; poop takes more time |
| Book-accurate warning format | Confirmed via patcoston.com reference |
| Headless sim uses stat floors + warning cap | Simulates "perfect play" — real players avoid death spirals through active management |

## Explicitly Deferred

- **Pain recovery mechanic** — Deferred since v0.5.0. Needs playtesting to assess whether permanent pain escalation is intentional difficulty or frustrating.
- **Tier 2 arc stages** — Architecture supports it, no data defined yet.
- **Crowd density pulsing animation** — Was in the visualization plan but cut for scope.
- **Alliance line animation** — Static dashed lines, not animated.

## Known Risks

- **Effort death spiral**: Uphill terrain + low stamina → maxSpeed caps → can't maintain 4.0 mph at any effort level. Real gameplay may surface this.
- **Headless sim masks balance issues**: Stat floors (stamina≥50, pain≤50) prevent death spirals that real players will encounter.
- **Web Speech API browser variance**: Voice selection and availability differ across browsers. Fallback is buzzer-only.
- **Visualization untested visually**: All canvas changes compile and pass headless but haven't been visually verified.
- **Crisis warningRisk unavoidable**: Crisis effects issue warnings regardless of player effort — can't be walked off.

## Key Files Modified

| File | Changes |
|------|---------|
| `src/engine.ts` | Effort speed system, stamina drain modifiers, crisis timer (realDeltaMs), warning format, pee/poop exports |
| `src/types.ts` | Added `effort`, `bowel` to PlayerState; crisis timer comments |
| `src/state.ts` | Init effort=62, bowel=0, speed=4.3 |
| `src/crises.ts` | Real-second timers, bowel tracking, warning format |
| `src/ui.ts` | Effort slider, pee/poop buttons, BWL stat, timer display |
| `src/main.ts` | Effort arrow keys, warning voice extraction |
| `src/audio.ts` | playWarningVoice (Web Speech API) |
| `src/narrative.ts` | 8 Major events, warning format fixes |
| `src/visualization.ts` | Condition colors, terrain strip, weather, halftrack, labels, lines, markers |
| `tests/validate.ts` | Effort-based simulation with stat management |
| `docs/CHANGELOG.md` | v0.6.0 entry |
