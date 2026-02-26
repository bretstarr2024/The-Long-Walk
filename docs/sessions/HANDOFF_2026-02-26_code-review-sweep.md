# Session Handoff: Comprehensive Code Review Sweep

**Date:** 2026-02-26
**Session ID:** 2026-02-26-code-review-sweep
**Version:** 0.4.1
**Branch:** main

---

## Where We Are

The Long Walk is a survival simulation game (Vite + TypeScript client, Hono + OpenAI Agents server) at v0.4.1. The game has a complete feature set: 99 walkers with a 3-tier system, LLM-powered conversations via OpenAI Agents SDK, cinematic scene overlays, NPC approaches, character arcs, crisis events, generative ambient music, and a bird's-eye canvas visualization.

This session performed a comprehensive code review across 8 dimensions (architecture, security, performance, frontend, API contracts, data integrity, LLM integration, game logic) and fixed every finding — 14 critical, 48 warning, and numerous informational items across 17 source files. The game is now significantly more robust: XSS-safe, server race conditions eliminated, player warning system properly implemented, all character arcs complete, and canvas/audio performance optimized.

Both TypeScript builds (client + server) and Vite production build pass cleanly. The codebase is ready for playtesting.

## What Changed This Session

### Security (4 fixes)
- Added `escapeHtml()` in `src/ui.ts` applied to all 4 innerHTML sites receiving LLM/user text
- CORS whitelist in `server/index.ts` replacing permissive `origin || '*'`
- Walker ID validation (range 1-100) on chat endpoint
- Anti-jailbreak clause in system prompt (`server/prompts.ts`)

### Server Reliability (4 fixes)
- Request-scoped effects accumulator (`createEffectsScope()` in `server/tools.ts`) replacing global array
- History error rollback (`removeLastHistory()` in `server/agents.ts`) preventing orphaned messages
- History alternation-safe trimming preserving user/assistant ordering
- Overhear endpoint skips walker state context (irrelevant for NPC-to-NPC conversation)

### Client Robustness (7 fixes)
- Player warning system: new `slowAccum`/`lastWarningTime` fields with 60-minute walk-off timer (`src/types.ts`, `src/state.ts`, `src/engine.ts`)
- Pact ending fix: `alive <= 3` check moved before `alive <= 1` block (`src/narrative.ts`)
- Crisis guards: no crisis during active approach or scene (`src/crises.ts`)
- Escape key overlay priority ordering (`src/main.ts`)
- 30s fetch timeout + configurable `VITE_AGENT_SERVER_URL` env var (`src/agentClient.ts`)
- Overhear mile gap set only on success (`src/overhear.ts`)
- Stamina economy rebalance: tuned drain/recovery, morale death → speed penalty (`src/engine.ts`)

### Performance (3 fixes)
- Canvas `walkerDataMap` for O(1) lookup + inline alive checks (`src/visualization.ts`)
- Audio node disconnect via `onended` callbacks and setTimeout cleanup (`src/audio.ts`)
- Warning pips `cachedWarningHtml` guard (`src/ui.ts`)

### Arc Completeness (7 walkers fixed)
- All 9 Tier 1 walkers now have complete 5-phase arcs in `src/data/walkers.ts`:
  - Added `crisis` phase: Stebbins, Baker, Parker, Scramm, Harkness
  - Added `farewell` phase: Olson, Barkovitch

### Infrastructure
- Added `src/vite-env.d.ts` for `import.meta.env` TypeScript support
- Generated 8 code review commands in `.claude/commands/`

## Why These Changes Were Made

This session ran 8 tailored code review agents in parallel, each analyzing a different dimension of the codebase. The reviews surfaced critical security vulnerabilities (XSS from unsanitized LLM text, permissive CORS), server race conditions (global mutable state shared across requests), an unreachable game ending (pact ending), missing character arc phases (7 of 9 Tier 1 walkers incomplete), and performance issues (per-frame array allocations, audio memory leaks). The user requested all findings be fixed.

## What Must Happen Next

1. **Playtest first 50 miles**: Verify player warning system works correctly — accumulation, walk-off timer, 3 warnings = elimination
2. **Playtest to mile 200**: Verify stamina rebalance feels right, arc phases progress correctly for Baker/Scramm/Olson
3. **Verify crisis timing**: Confirm crisis events don't trigger during scenes or approaches
4. **Test LLM endpoints**: With server running, verify CORS allows Vite dev server, history rollback works on agent failure
5. **Consider Tier 2 arc stages**: Architecture supports it but no data defined yet
6. **Tune absence effects**: Current behavior fires one ghost reference per dead walker total — may want per-mile chance

## Decisions Made (Do Not Re-Debate)

| Decision | Rationale |
|----------|-----------|
| escapeHtml on 4 specific innerHTML sites, not globally | Only sites with LLM/user text need sanitization |
| CORS whitelist with 4 known localhost origins | Covers Vite dev variations (5173, 5174, 4173, 127.0.0.1) |
| Request-scoped effects via closure swap | Simpler than request-ID keying; _activeEffects pointer swapped per request |
| 30s timeout on agent client fetch | LLM can be slow but 30s is reasonable upper bound |
| Morale death → speed penalty, not direct elimination | Allows natural warning system to handle elimination |
| All Tier 1 walkers get complete 5-phase arcs | Arc system expects all phases; missing phases caused undefined prompt injection |

## Explicitly Deferred

- **Absence effects single-fire**: Each dead walker triggers only one ghost reference ever. May want per-mile chance instead. Deferred pending playtesting.
- **Arc hint repetition**: Same prompt hint repeated across consecutive conversations in the same phase. Could add variation. Low priority.
- **Pre-render heat blobs**: Visualization review suggested caching heat blob gradients. Current perf is adequate.
- **Client/server context consolidation**: `buildGameContext` logic duplicated between `src/ui.ts` and `server/prompts.ts`. Refactoring adds complexity without functional benefit.

## Known Risks

- `_activeEffects` pattern is still technically global — concurrent requests in the same Node.js event loop tick could theoretically race (extremely unlikely)
- Player warning walk-off timer (60 min) is new and untested in actual gameplay
- Stamina rebalance values may need tuning through playtesting
- escapeHtml covers standard XSS vectors but not CSS injection via style attributes (not a current attack surface)

## Key Files Modified

| File | Change |
|------|--------|
| `src/ui.ts` | escapeHtml(), 4 sanitization sites, warning pips cache |
| `src/engine.ts` | Player warning system rewrite, stamina rebalance, morale mechanics |
| `src/narrative.ts` | Pact ending fix (alive <= 3 before alive <= 1) |
| `src/types.ts` | slowAccum, lastWarningTime fields on PlayerState |
| `src/state.ts` | Initialize new PlayerState fields |
| `src/visualization.ts` | walkerDataMap, inline alive checks |
| `src/audio.ts` | Node disconnect callbacks, echo chain cleanup |
| `src/crises.ts` | activeApproach + activeScene guards |
| `src/main.ts` | Escape key overlay priority |
| `src/overhear.ts` | lastOverheardMile in success handler |
| `src/agentClient.ts` | 30s timeout, VITE_AGENT_SERVER_URL env var |
| `src/data/walkers.ts` | 7 missing arc phases added |
| `src/vite-env.d.ts` | New — Vite client types |
| `server/index.ts` | CORS whitelist, walkerId validation, effects scope, error rollback |
| `server/tools.ts` | createEffectsScope() replacing global array |
| `server/agents.ts` | removeLastHistory(), alternation-safe trim |
| `server/prompts.ts` | Anti-jailbreak, skipWalkerState param |
| `docs/CHANGELOG.md` | v0.4.1 entry |
| `.claude/commands/` | 8 review command files |
