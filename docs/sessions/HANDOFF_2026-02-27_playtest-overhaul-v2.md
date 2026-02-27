# Session Handoff: Playtest Overhaul v2 (v0.8.0)

**Date:** 2026-02-27
**Session ID:** 2026-02-27-playtest-overhaul-v2
**Version:** 0.8.0
**Branch:** main

---

## Where We Are

The Long Walk is a survival simulation game (Vite + TypeScript client, Hono + OpenAI Agents server) at v0.8.0. The game is deployed on Railway at https://the-long-walk-production.up.railway.app. This session addressed 8 items from a playtest session: 7 implemented, 1 documented as roadmap.

The game now has book-accurate warning callouts (cold, clinical "Warning. Warning 47." format), a new speech bubble system for overheard conversations and bystander warning reactions, colorful SVG icons for all social actions, and several UX fixes (chat close button, approach overlay clicks, scene transitions, Think cooldown). The codebase compiles cleanly (client + server TypeScript, Vite build) and was deployed to Railway.

The road visualization was flagged as needing a complete overhaul and is documented in `docs/ROADMAP_visualization.md` for future work.

## What Changed This Session

### Client — New Features
- **Book-accurate warning format**: "Warning. Warning [number]." / "Second warning, [number]." / "Third warning, [number]. Final warning." — periods not exclamations, numbers only, no names. Applied to player warnings, NPC warnings, and 4 scripted scenes.
- **Speech bubble system**: New `#speech-bubble-container` overlay (z-index 110, top-right). Overheard conversations appear as staggered cartoon bubbles with speaker name, italic text, and bubble tails. Warning reactions from nearby Tier 1/2 NPCs fire when someone gets warned in the player's position (sympathetic/neutral/unsympathetic based on relationship).
- **Icon system**: 11 inline SVG icons (14px) with bright accent colors — food (amber), water (blue), story (purple), encourage (green), walk (green), alliance (green), bond (gold), break (red), talk (blue), think (purple), observe (amber). Applied to chat social actions, main actions panel, and dossier Talk button.
- **Think About Prize cooldown**: 5-mile cooldown via `lastThinkMile` on PlayerState. Button shows remaining miles when on cooldown.

### Client — UX Fixes
- **Chat close button**: Moved from inline flex row next to STOP to absolute top-right of `.llm-chat-box`. Uses `&times;` character with red hover effect.
- **Approach overlay buttons**: Fixed unclickable buttons during LLM streaming. Now uses stable DOM pattern — banner created once, only `.approach-text` updated during streaming. Buttons never destroyed mid-click.
- **Scene overlay blink**: Fixed panel transition flicker. `handleSceneNext` now regenerates the template HTML string for cache sync instead of reading `container.innerHTML` (browser serialization differs from template literal).

### Infrastructure
- **v0.7.1 deployed to Railway**: Confirmed security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy) working in production.
- **v0.8.0 deployed to Railway**: Pushed via Railway MCP tool after commit.
- **Road visualization roadmap**: Created `docs/ROADMAP_visualization.md` — documents what needs to happen for the complete overhaul.

## Why These Changes Were Made

The user playtested the game and identified 8 issues ranging from tone problems (warnings using exclamation marks instead of the book's clinical periods) to broken UI (approach buttons unclickable) to missing features (no icons, no speech bubbles for overheards). All were addressed based on detailed notes with screenshots.

## What Must Happen Next

1. **Playtest v0.8.0** to verify speech bubbles, icons, and warning format feel right
2. **Tune bubble timing** — durations and stagger may need adjustment after real gameplay
3. **Fix `npm run validate`** for Node.js 25.6.1 (`import.meta.env` undefined in tsx)
4. **Begin road visualization overhaul** per `docs/ROADMAP_visualization.md`

## Decisions Made (Do Not Re-Debate)

- **Warning format: periods, not exclamations** — Book-accurate. King describes flat, mechanical callouts.
- **Speech bubbles: top-right positioned** — Avoids overlap with centered approach banners and scene overlays.
- **engine.ts → ui.ts circular import** — Accepted pattern (same as engine ↔ crises). Runtime-only, Vite handles it.
- **5-mile Think cooldown** — Matches Encourage cooldown pattern. Prevents morale exploit.
- **Icons: inline SVG** — Full color control, no font dependency, cross-platform consistency.

## Explicitly Deferred

- **Road visualization overhaul**: Too large for one session. Documented in `docs/ROADMAP_visualization.md` with must-have / should-have / nice-to-have breakdown.
- **Validation suite Node.js 25 fix**: Needs `import.meta.env` polyfill or conditional import in test harness.
- **Mobile testing**: Speech bubbles and responsive breakpoints not tested on actual devices.

## Known Risks

- `engine.ts → ui.ts` circular import adds another edge to the dependency graph (runtime-only, so safe, but increases complexity)
- Speech bubble stagger uses `setTimeout` — bubbles appear on real-time schedule even if game is paused
- `npm run validate` broken on Node.js 25.6.1 (pre-existing, not from this session)

## Key Files Modified

| File | Changes |
|------|---------|
| `src/engine.ts` | Book-accurate warning format (player + NPC), name removed from NPC warnings, warning reaction speech bubbles |
| `src/narrative.ts` | 4 scripted warnings updated, checkOverheards → queueOverheardBubbles |
| `src/overhear.ts` | LLM overheards → speech bubbles, parse Name:text format |
| `src/ui.ts` | ICON system (11 SVGs), speech bubble renderer + exports, approach stable DOM, chat close btn, scene cache fix, think cooldown |
| `src/styles.css` | Speech bubble CSS, icon color classes, chat-close-btn, responsive bubble breakpoint |
| `src/types.ts` | SpeechBubble interface, GameState fields (speechBubbles, nextBubbleId), PlayerState field (lastThinkMile) |
| `src/state.ts` | Default values for new state fields |
| `docs/CHANGELOG.md` | v0.8.0 entry |
| `docs/ROADMAP_visualization.md` | New — road visualization overhaul roadmap |
