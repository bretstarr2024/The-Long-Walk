# Session Handoff: Playtest Fixes v0.8.4

**Date:** 2026-02-27
**Session ID:** 2026-02-27-playtest-fixes-v084
**Version:** 0.8.4
**Branch:** main

---

## Where We Are

The Long Walk is a survival simulation game at v0.8.4, deployed to Railway production. The game features 99 NPC walkers with LLM-powered conversations (Tier 1/2) on a 400-mile death march. The user playtested on production and reported 10 bugs/feature requests, all of which were implemented this session.

The core gameplay loop is functional: walk, manage stats (stamina, hydration, hunger, pain, morale, clarity), talk to walkers, form relationships, survive. Warning systems, elimination timing, crisis events, and the approach system all work. The new ticket popup adds visual feedback for eliminations, the stretch action gives players a way to manage pain, and clarity now has a meaningful impact on gameplay.

Production is live at https://the-long-walk-production.up.railway.app with the health check passing. Both client and server TypeScript compile clean. The Vite build succeeds.

## What Changed This Session

### Client — Engine (src/engine.ts)
- **NPC warning visibility**: `issueNPCWarning` now narrates warnings for ALL tiers (was silently skipping Tier 3 walkers at different positions). This was the critical bug — walkers were getting eliminated without any visible warning entries
- **Backstop elimination fix**: `checkNPCEliminations` backstop now routes through `pendingEliminations` queue (was calling `eliminateWalker` immediately, bypassing the 2s delay)
- **Terrain change notifications**: `updateEnvironment` detects terrain transitions and adds contextual narrative messages ("The road tilts upward", "The hill levels out", etc.)
- **Ticket data generation**: `eliminateWalker` now sets `state.activeTicket` with walker info, motivation, mile, placement. `getWalkerMotivation()` derives motivation from walker data (reason field, age, arc stage) with generic fallbacks
- **Clarity drain overhaul**: Starts draining at hour 6 (was hour 16). Rates increased. Pain above 50 accelerates drain. Below 40 clarity, random effort drift ±3-8 per tick
- **Game over improvements**: `issueWarning` increments `totalWarningsReceived` (lifetime counter). Sets contextual `causeOfDeath` based on which stat was critically failing (exhaustion, dehydration, starvation, pain, despair, confusion)

### Client — UI (src/ui.ts)
- **Ticket popup**: `updateTicket()` creates tear-off stub with dashed perforation borders, "TICKET PUNCHED" red stamp, walker number/name/state/motivation, mile and ordinal placement. Auto-dismisses after 5s (Tier 3) or 8s (Tier 1/2) with fade animation
- **Stretch action**: New `handleStretch()` — 8-12 pain relief, -2 stamina cost, 3-mile cooldown. New stretch icon SVG. Button in actions panel with disabled/cooldown states
- **Walk Together label**: Social action button changed from "Walk" to "Walk Together"
- **Observe morale boost**: `handleObserve` now grants +2 morale (or +1 at night)
- **Conversation tracking**: `closeLLMDialogue` now pushes to `state.conversationHistory` so game over stats count LLM chats
- **Cause of death display**: Game over screen shows `causeOfDeath` in red italic text

### Client — Types/State (src/types.ts, src/state.ts)
- `TicketData` interface (walkerNumber, name, homeState, motivation, mile, placement, tier, startTime)
- `activeTicket: TicketData | null` on GameState
- `lastStretchMile`, `totalWarningsReceived`, `causeOfDeath` on PlayerState

### Client — Other Files
- `src/narrative.ts`: `getGameStats` uses `totalWarningsReceived`, counts unique "Walkers Talked To"
- `src/data/route.ts`: Flat/uphill/downhill ambient descriptions updated to not contradict terrain change notifications
- `src/visualization.ts`: Mile markers prefixed with "mi" to avoid looking like elevation numbers
- `src/styles.css`: Full ticket popup CSS (perforation, stamp, body, meta, animations, responsive, reduced-motion). Stretch icon color. Game over cause styling

### Infrastructure
- Deployed to Railway production, health check passing

## Why These Changes Were Made

The user did a playtest on production and reported bugs as they encountered them. The most critical issue was that walkers were getting eliminated without any visible warnings — the `issueNPCWarning` function had a Tier 1/2 gate that silently dropped Tier 3 warnings. Other issues ranged from confusing UI (terrain mismatch, unclear button labels, no cause of death) to missing gameplay mechanics (no way to manage pain, clarity stat always 100, morale not boosted by observing).

## What Must Happen Next

1. **Playtest v0.8.4 on production** — Verify ticket popups appear on elimination, terrain notifications fire, stretch action works, clarity drains properly
2. **Monitor narrative log density** — All-tier warning narration may create wall-of-text during mass elimination phases in Act 3-4. May need to throttle Tier 3 warning narration
3. **Consider visualization roadmap** — The route visualization has a documented roadmap in `docs/ROADMAP_visualization.md`
4. **Continue with next round of playtest feedback**

## Decisions Made (Do Not Re-Debate)

- **Terrain changes are narrated**, not just shown on GRADE meter — players don't notice meter changes
- **Clarity drain at hour 6** (not 16) — was functionally inert at hour 16+
- **Ticket dismiss timing**: 5s Tier 3, 8s Tier 1/2 — named walkers need more reading time
- **Observe gives +2/+1 morale** — immediate tangible benefit
- **Stretch costs stamina** (-2) for pain relief (8-12) with 3-mile cooldown — meaningful tradeoff
- **totalWarningsReceived** is a separate lifetime counter — `player.warnings` resets on walk-off
- **causeOfDeath** is contextual per failing stat — more interesting than generic death message
- **No food/water inventory system** — cooldown-based gating is sufficient (decided v0.8.3, still holds)

## Explicitly Deferred

- **Sweet spot indicator on effort meter** — discussed but not implemented
- **Varied pleading voice per walker** — open from v0.8.3
- **Ticket popup for player death** — only shows for NPCs currently

## Known Risks

- Tier 3 warning narration may flood the narrative log during mass elimination phases (was previously silent)
- Clarity drain at hour 6 may be too aggressive for new players
- `npm run validate` fails on Node.js 25 due to `import.meta.env` (pre-existing, not blocking)
- Web Speech API male voice filter may not find male voice on all platforms

## Key Files Modified

| File | Change |
|------|--------|
| src/engine.ts | NPC warning visibility (all tiers), backstop fix, terrain notifications, ticket data, clarity drain, causeOfDeath, totalWarningsReceived |
| src/ui.ts | Ticket popup renderer, stretch action, Walk Together label, observe morale, conversation tracking, cause of death display |
| src/types.ts | TicketData interface, activeTicket, lastStretchMile, totalWarningsReceived, causeOfDeath |
| src/state.ts | Default values for new PlayerState/GameState fields |
| src/styles.css | Ticket popup CSS, stretch icon color, gameover-cause styling, reduced-motion entries |
| src/narrative.ts | Game over stats: totalWarningsReceived, unique walkers talked to |
| src/data/route.ts | Updated ambient terrain descriptions |
| src/visualization.ts | Mile markers prefixed with "mi" |
| docs/CHANGELOG.md | v0.8.4 entry |
