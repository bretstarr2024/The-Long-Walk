# Session Handoff: Chat Interface, Relationships & Player Interaction Overhaul

**Date:** 2026-02-27
**Session ID:** 2026-02-27-chat-relationship-overhaul
**Version:** 0.7.0
**Branch:** main

---

## Where We Are

The Long Walk is a survival simulation game (Vite + TypeScript client, Hono + OpenAI Agents server) deployed to Railway. As of v0.7.0, the game has a complete social interaction system built around the chat interface. Players can form relationships with any of the 99 walkers, propose and break alliances, bond with a single ally, make enemies, and engage in both social and hostile actions — all from the in-game chat card.

The chat overlay now shows a relationship gauge (gradient bar with marker and tier label), stat bars for both player and NPC, social action buttons (share food/water, tell a story, encourage, walk together), hostile action buttons for enemies, and alliance management buttons. A "Stop the World" pause button lets players read and respond without the game clock advancing.

The enemy system creates dynamic antagonists through relationship thresholds, with 5 NPC-initiated crisis types and 7 player-initiated hostile actions. A 3rd-warning safety rule prevents any hostile action from directly killing a walker. The bonded ally system creates a deep relationship with one walker, and their death triggers a devastating grief crisis.

All 8 code review commands were run as an audit. The 6 most critical findings were fixed: the `_activeEffects` race condition (now closure-bound per request), act transition regression/skipping, poop narrative ordering, enemy prompt gating, scene panel XSS, and absence effect O(n²) lookup.

## What Changed This Session

### Client
- **8-tier relationship spectrum** (`types.ts`, `state.ts`): Enemy → Hostile → Wary → Neutral → Friendly → Close → Allied → Bonded with color-coded labels and `getRelationshipTier()` function
- **Chat card overhaul** (`ui.ts`, `styles.css`): Relationship gauge with gradient bar + marker + trend arrow, stat bars for player/NPC morale/stamina, social action buttons with cooldown timers, hostile action buttons for enemies
- **"Stop the World" pause** (`ui.ts`): Toggle in chat header pauses game while keeping chat active, auto-resumes on close
- **Social actions** (`ui.ts`, `engine.ts`): Share food/water (any walker), tell a story (neutral+), encourage (any), walk together (friendly+)
- **Hostile actions** (`ui.ts`, `engine.ts`): Taunt, lullaby, isolation, pace pressure, crowd turn, trip, steal — with 3rd-warning safety
- **Alliance expansion** (`ui.ts`, `engine.ts`): Propose alliance (rel ≥ 40), propose bond (allied + rel ≥ 85), break alliance (→ instant enemy)
- **Enemy system** (`engine.ts`, `crises.ts`): Auto-detect at relationship < -40 with hysteresis, 5 enemy crisis types, bonded grief crisis
- **Enemy visualization** (`visualization.ts`): Red pulsing ring for enemies, gold inner ring for bonded allies
- **Enemy approaches** (`approach.ts`): `enemy_confrontation` type at priority 4
- **Scene panel XSS fix** (`ui.ts`): `escapeHtml()` on both scene text render paths
- **Absence effects performance** (`narrative.ts`): O(1) `getWalkerData()` replaces O(n) `.find()`
- **Act transitions fix** (`engine.ts`): Monotonically increasing — can never regress or skip
- **Poop narrative fix** (`engine.ts`): Description added before warnings (not after potential elimination)
- **Validation** (`tests/validate.ts`): 2 new checks — enemy/bond initialization, tier boundaries (22 total)
- **Audit command** (`.claude/commands/audit.md`): `/audit` runs all 8 reviews in parallel

### Server
- **Effects race condition fix** (`server/tools.ts`): `createEffectsScope()` returns `{ effects, tools }` — tools are closure-bound to their own effects array. No module-level mutable state
- **Agent per-request** (`server/agents.ts`): `getOrCreateAgent()` creates fresh agent with scoped tools each request
- **Scoped tools in chat** (`server/index.ts`): Chat endpoint passes scoped tools to agent
- **Enemy prompt fix** (`server/prompts.ts`): Enemy/bonded/allied context moved outside `arcPhase` guard — works for all Tier 1/2 walkers

## Why These Changes Were Made

The chat interface was functional but shallow — relationships were a hidden number with 4 coarse labels, there was no way to pause while chatting, no way to propose alliances from conversation, and no hostile interaction system. In the novel, relationships are life-or-death: Barkovitch destroys people with words, McVries saves Garraty by keeping him awake, and alliances are bonds of survival. This overhaul makes relationships the core gameplay loop.

The audit fixes address real bugs found by running all 8 review commands: the most critical was the `_activeEffects` race condition where concurrent SSE requests could leak effects between conversations.

## What Must Happen Next

1. **Playtest the relationship system** — verify gauge renders, social actions work, relationship changes trigger morale/stamina bonuses
2. **Test enemy system end-to-end** — break an alliance, verify enemy detection fires, test hostile actions, verify 3rd-warning safety blocks lethal actions
3. **Test bonded grief crisis** — form a bond, let the bonded ally die, verify crisis triggers with correct options
4. **Deploy v0.7.0 to Railway** — push triggers auto-deploy; verify production build works
5. **Add rate limiting** to server endpoints (identified by audit, not yet implemented)
6. **Extract social/hostile action handlers** from ui.ts — it's 2,070 lines and growing

## Decisions Made (Do Not Re-Debate)

- **8 tiers, not 4**: The novel's relationship range demands granularity. Enemy/hostile/wary/neutral/friendly/close/allied/bonded maps to the book's spectrum.
- **Social actions on ANY walker**: Restricting sharing to allies-only loses the humanity of the Walk. The book has walkers sharing with strangers.
- **Enemy hysteresis band (-40 to become, -20 to stop)**: Prevents rapid flipping at the threshold.
- **3rd-warning safety on ALL hostile actions**: Direct kills via hostile actions feel unfair. The soldiers kill you, not walkers.
- **Closure-bound tools per request**: Eliminates the race condition cleanly. Agent instances are lightweight.
- **Monotonic act transitions**: Acts should never go backwards. Fast eliminations advance you, they don't regress you.
- **Retaliate false positive**: Audit flagged supply_interference retaliate as a 3rd-warning bypass, but the `< 2` guard is correct — max outcome is warning 2.

## Explicitly Deferred

- **Rate limiting on LLM endpoints** — needs middleware work, separate concern
- **Z-index documentation fix** in CLAUDE.md — Scene (z-200) should be listed highest
- **Stebbins 3rd decline narrative** — only has 2 vs 3-4 for other Tier 1 walkers
- **Extract social/hostile handlers** from ui.ts — architectural cleanup for later
- **Canvas walker iteration consolidation** — 5 separate loops for different ring types
- **Terrain strip caching** — recomputes pixel-by-pixel each frame
- **Roadmap items**: Zone map, think cooldown, proximity-based conversations

## Known Risks

- **ui.ts is ~2,070 lines** — approaching god module territory. Growing with each feature.
- **No rate limiting** — spam-clicking Talk causes unlimited API calls
- **Hostile actions bypass normal warning pipeline** — directly set warnings instead of going through `issueWarning()`
- **Walk Together persists across chat sessions** — should reset on chat close
- **Enemy confrontation priority 4** may be too low (below introduction at 3)

## Key Files Modified

| File | Lines Changed | What Changed |
|------|--------------|--------------|
| `src/ui.ts` | +423 | Chat card overhaul, social/hostile actions, alliance buttons, pause button, scene escapeHtml |
| `src/crises.ts` | +315 | 6 new crisis types, special resolutions, bonded grief trigger |
| `src/engine.ts` | +124 | Enemy detection, social handlers, hostile handlers, act fix, poop fix |
| `src/styles.css` | +173 | Relationship gauge, stat bars, action buttons, tier colors |
| `server/tools.ts` | ±112 | Closure-bound tools per request (race condition fix) |
| `src/types.ts` | +28 | RelationshipTier, enemy/bond fields, new crisis/approach types |
| `src/visualization.ts` | +37 | Enemy pulsing ring, bonded gold ring |
| `tests/validate.ts` | +41 | 2 new validation checks |
| `server/prompts.ts` | +29 | Enemy/bonded/allied context outside arc guard |
| `src/approach.ts` | +17 | Enemy confrontation approach type |
| `server/agents.ts` | ±13 | Per-request agent with scoped tools |
| `server/index.ts` | ±10 | Scoped effects/tools in chat endpoint |
| `src/narrative.ts` | ±8 | O(1) getWalkerData in absence/hallucination |
| `src/state.ts` | +21 | getRelationshipTier(), new field initialization |
| `.claude/commands/audit.md` | +15 | New /audit command |
| `docs/CHANGELOG.md` | +49 | v0.7.0 entry |
