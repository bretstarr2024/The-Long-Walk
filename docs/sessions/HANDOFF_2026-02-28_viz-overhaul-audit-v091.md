# Session Handoff: Green Phosphor Radar + Full Audit Remediation

**Date:** 2026-02-28
**Session ID:** 2026-02-28-viz-overhaul-audit-v091
**Version:** 0.9.1
**Branch:** main

---

## Where We Are

The Long Walk is a fully playable survival simulation at v0.9.1. The game features 99 walkers (9 Tier 1 with full LLM agent conversations, 15 Tier 2 with LLM conversations, 75 Tier 3 background walkers) on a 400-mile death march. Players manage effort, stamina, morale, and relationships while walking south from the Maine/Canada border.

This session delivered two major changes: (1) a complete visualization overhaul replacing the thermal satellite view with a CRT green phosphor radar aesthetic, including Geiger counter audio that intensifies near struggling walkers, and (2) a comprehensive audit remediation fixing all 18 findings from an 8-category code review (3 critical, 15 warnings). The game is deployed to Railway production and the health check confirms it's running.

All TypeScript checks pass (client + server), the Vite production build succeeds, and the deployment health endpoint returns OK.

## What Changed This Session

### Visualization
- **Complete visual redesign**: Replaced thermal satellite view with CRT green phosphor radar — dark background, phosphor green palette, rotating radar sweep with glow trail, scanline overlay, vignette effect
- **Walker rendering overhaul**: Condition-based color coding (bright green → amber → red → dim gray), pulsing player dot, alliance/enemy ring indicators adapted to phosphor palette
- **Geiger counter audio**: New `GeigerController` class in audio.ts — ambient clicking that intensifies based on proximity to walkers in danger (high warnings, low stamina). Tick rate scales with danger level
- **CRT CSS effects**: Scanline overlay and vignette corners via CSS pseudo-elements on the visualization container

### Client — Audit Fixes
- **`issueWarningRaw()`** (engine.ts): New function that applies all warning side effects (totalWarningsReceived, morale drain, timers, 3rd-warning death) WITHOUT adding narrative text. Trip, steal, and retaliate hostile actions now use this instead of raw `p.warnings++`
- **Shared `contextBuilder.ts`** (NEW file): Extracted `buildGameContext()` and `buildWalkerProfile()` from ui.ts, overhear.ts, and approach.ts — removed ~200 lines of duplicated code. Automatically fixed missing two-pass arc fallback in approach.ts
- **`closeDossier()` export** (ui.ts → main.ts): Dossier panel now dismissible via Escape key, inserted into the overlay priority chain
- **Overhear overlay guards** (overhear.ts): Ambient overheards now blocked during active crisis, LLM dialogue, scene, or approach overlays
- **Introduction approach window** (approach.ts): Extended from mile 20 to mile 30 to match Act 1 boundary
- **Alliance relationship floor** (crises.ts): `Math.max(0, ...)` → `Math.max(-100, ...)` so broken alliances can properly become enemies
- **Arc stage overlaps** (data/walkers.ts): Olson crisis/farewell and Barkovitch crisis/farewell mileRanges no longer overlap
- **Elimination scene guard** (engine.ts): setTimeout now checks `!state.llmDialogue` to prevent scene queuing during chat
- **Visualization elimination count** (visualization.ts): O(n) `.filter().length` → O(1) `state.eliminationCount`

### Server — Security Hardening
- **Global error handler**: `app.onError()` catches unhandled route errors, returns safe 500
- **CSP + HSTS headers**: Content-Security-Policy and Strict-Transport-Security added to all responses
- **60s server-side timeout**: `Promise.race()` wrapping OpenAI `run()` calls in `createSSEResponse()`
- **Zod schema validation**: All 3 endpoints (chat, overhear, approach) validate walker profiles and game context payloads
- **Approach type whitelist**: Server rejects unknown approach types with 400

### Documentation
- **CHANGELOG.md**: Added v0.9.1 entry covering both visualization overhaul and audit remediation
- **MEMORY.md**: Updated stale timing values (2s→8s), message cap (2000→1000), added contextBuilder.ts, issueWarningRaw, server timeout, global error handler, security headers

## Why These Changes Were Made

The visualization overhaul was motivated by wanting a more immersive, thematically appropriate visual style. The thermal satellite view was functional but felt generic — the green phosphor radar aesthetic matches the dystopian surveillance theme of The Long Walk and creates a more atmospheric experience.

The audit remediation was triggered by running `/audit` (all 8 code review commands in parallel). It surfaced 3 critical issues (warning bypass, duplicated context builders, missing arc fallback) and 15 warnings spanning security, performance, UX, and documentation. All 18 findings were addressed in 5 phases ordered by severity.

## What Must Happen Next

1. **Playtest the green phosphor radar** in production — verify visual quality, readability, and performance across different screen sizes
2. **Verify Geiger counter audio** doesn't conflict with existing ambient drone/music
3. **Consider wiring up conversationFlags** — the `set_flag` agent tool writes flags but the client never reads them. Could influence NPC behavior in future conversations
4. **Consider adding more NPC relationship arc stages** for mid-game content density

## Decisions Made (Do Not Re-Debate)

1. **Green phosphor CRT aesthetic** for visualization — matches dystopian surveillance theme
2. **`issueWarningRaw()` as separate function** — not a parameter on `issueWarning()`. Cleaner separation for paths with custom narratives
3. **Optional `walkerNum?` parameter** on shared `buildGameContext()` — zeroes walker stats when omitted (overhear narrator), no need for two functions
4. **Zod parse in try/catch returning generic 400** — never leak schema structure to clients
5. **Introduction approach window = 30 miles** — matches Act 1 boundary for more natural intro pacing

## Explicitly Deferred

- **conversationFlags read path**: Server `set_flag` tool writes flags but client never reads them. Flagged with TODO comment. Kept for future use — could drive NPC memory/behavior in conversations

## Known Risks

- **CSP header may be too restrictive** if new external resources (fonts, images, scripts) are added — test any new sources against the policy
- **60s Promise.race timeout creates orphaned OpenAI runs** — if the timeout fires, the underlying `run()` continues consuming API credits in the background. The OpenAI SDK doesn't expose a cancel mechanism for streaming runs
- **Geiger counter + ambient music interaction** — untested together in production. May need volume balancing

## Key Files Modified

| File | Change |
|------|--------|
| `src/visualization.ts` | Complete rewrite — CRT green phosphor radar |
| `src/audio.ts` | Added GeigerController class |
| `src/styles.css` | CRT scanline + vignette CSS |
| `src/types.ts` | Visualization config types |
| `src/contextBuilder.ts` | NEW — shared context builders |
| `src/engine.ts` | issueWarningRaw(), setTimeout guard, comment fix |
| `src/ui.ts` | Removed dupe builders, closeDossier(), warning bypass fix |
| `src/approach.ts` | Shared builders, intro window extended |
| `src/overhear.ts` | Shared builders, overlay guards |
| `src/crises.ts` | Warning bypass fix, relationship floor fix |
| `src/main.ts` | closeDossier in Escape handler |
| `src/data/walkers.ts` | Arc stage overlap fixes |
| `server/index.ts` | Zod, error handler, CSP/HSTS, timeout, whitelist |
| `server/tools.ts` | TODO comment on write-only flags |
| `docs/CHANGELOG.md` | v0.9.1 entry |
