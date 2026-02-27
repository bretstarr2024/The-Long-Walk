# Session Handoff: Playtest Fixes v0.8.5

**Date:** 2026-02-27
**Session ID:** 2026-02-27-playtest-fixes-v085
**Version:** 0.8.5
**Branch:** main

---

## Where We Are

The Long Walk is a survival simulation game at v0.8.5, deployed to Railway production. The game features 99 NPC walkers with LLM-powered conversations (Tier 1/2) on a 400-mile death march. This session addressed 4 playtest issues: ticket popups not staying up long enough and getting overwritten by subsequent eliminations, the "Look Around" action being spammable for free morale, bystander reaction speech bubbles firing on non-fatal warnings, and the game over screen showing a confusing warning count.

The core gameplay loop is stable. Warning systems, elimination timing, crisis events, approach system, ticket popups, and all action cooldowns work correctly. Both client and server TypeScript compile clean, and the Vite build succeeds.

## What Changed This Session

### Client — UI (src/ui.ts)
- **Ticket queue stacking**: Rewrote `updateTicket()` from single-ticket to queue-based system. Each ticket gets its own DOM element (created by unique ID), displayed for 5s visible + 1.2s fade-out (6.2s total). Multiple tickets stack vertically via flexbox `column-reverse` with 10px gap. Expired tickets filtered from `state.ticketQueue` and removed from DOM each frame
- **Look Around cooldown**: `handleObserve()` now early-returns if within 3 miles of last use (`lastObserveMile`). Button shows disabled state with remaining miles when on cooldown, matching Stretch/Prize pattern

### Client — Engine (src/engine.ts)
- **Warning reaction bubbles gated to elimination**: Bystander reaction bubble code (sympathetic/neutral/unsympathetic lines) now only fires when `w.warnings >= 3` (final warning, about to be eliminated). Previously fired on all warnings 1-3, causing misleading reactions like "There goes another one..." when the walker was still alive
- **Ticket queue push**: `eliminateWalker()` pushes to `state.ticketQueue` instead of overwriting `state.activeTicket`

### Client — Types/State (src/types.ts, src/state.ts)
- `activeTicket: TicketData | null` → `ticketQueue: TicketData[]` on GameState
- Added `lastObserveMile: number` to PlayerState (default -10)

### Client — Narrative (src/narrative.ts)
- Game over "Warnings Received" stat now shows `player.warnings` (active count at death — always 3) instead of `totalWarningsReceived` (lifetime including walked-off warnings)

### Client — Styles (src/styles.css)
- `#ticket-container` now uses `display: flex; flex-direction: column-reverse; align-items: center; gap: 10px` for vertical ticket stacking

## Why These Changes Were Made

The user playtested on production and reported: (1) ticket popups disappeared too quickly and were overwritten when multiple walkers died close together, (2) Look Around could be spam-clicked for unlimited morale, (3) bystander speech bubbles like "there goes another one" appeared on routine warnings when nobody was actually dying, and (4) the game over screen showed "Warnings Received: 5" which was impossible since you die at 3 (it was counting walked-off warnings).

## What Must Happen Next

1. **Playtest v0.8.5 on production** — Verify ticket stacking during rapid eliminations, observe cooldown, warning reaction timing
2. **Monitor narrative log density** — Tier 3 warning narration (added in v0.8.4) may create wall-of-text during late-game mass eliminations
3. **Consider visualization roadmap or next round of playtest feedback**

## Decisions Made (Do Not Re-Debate)

- **Flat 5s display for all tickets** — simpler than tier-based timing, stacking handles rapid eliminations
- **Warning reactions only on 3rd warning** — "there goes another one" implies death, not a routine warning
- **Game over shows active warnings (3), not lifetime total** — walked-off warnings are noise on the death screen
- **Look Around 3-mile cooldown** — same as Stretch, prevents morale spam while remaining usable
- **No food/water inventory system** — cooldown-based gating is sufficient (decided v0.8.3, still holds)

## Explicitly Deferred

- **Sweet spot indicator on effort meter** — open from v0.8.4
- **Varied pleading voice per walker** — open from v0.8.3
- **Ticket popup for player death** — open from v0.8.4
- **`totalWarningsReceived` field** — kept in PlayerState but unused on game over screen; could be removed or repurposed

## Known Risks

- Tier 3 warning narration may flood narrative log during mass elimination phases (was previously silent)
- Clarity drain at hour 6 may be too aggressive for new players
- `npm run validate` fails on Node.js 25 (`import.meta.env` issue) — pre-existing, not blocking

## Key Files Modified

| File | Change |
|------|--------|
| src/types.ts | `activeTicket` → `ticketQueue`, added `lastObserveMile` |
| src/state.ts | Default `ticketQueue: []`, `lastObserveMile: -10` |
| src/engine.ts | Ticket push to queue, warning reaction gated to `warnings >= 3` |
| src/ui.ts | Queue-based `updateTicket()`, observe 3-mile cooldown + button state |
| src/narrative.ts | Game over warnings shows `player.warnings` not `totalWarningsReceived` |
| src/styles.css | Ticket container flexbox stacking |
| docs/CHANGELOG.md | v0.8.5 entry |
