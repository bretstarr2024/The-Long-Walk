# Session Handoff: Character Development Overhaul

**Date:** 2026-02-26
**Session ID:** 2026-02-26-character-development
**Version:** 0.4.0
**Branch:** main

---

## Where We Are

The Long Walk is a survival simulation game (Vite + TypeScript client, Hono + OpenAI Agents server) based on Stephen King's novel. 99 walkers compete in a 400-mile death march — the player is Walker #100.

Prior to this session, the game had solid mechanics (speed control, warnings, elimination, position changes, LLM chat, ambient music, crisis system) but character development was passive. NPCs only talked when the player initiated. Major story moments scrolled past as narrative log entries. Players could go 50+ miles without meaningfully engaging with any character.

This session implemented a comprehensive **Character Development Overhaul** — 6 interconnected systems that make NPCs feel alive, story moments unmissable, and character relationships meaningful. The game now has cinematic scene overlays for major moments, NPCs that proactively approach the player, multi-stage character arcs that evolve LLM conversations over time, arc-aware NPC relationship overheards, walker dossiers showing what you know about each character, and emotional impact systems (decline narratives, absence ghost references) that make deaths feel significant.

## What Changed This Session

### Client — New Systems
- **Scene overlay system** (`src/narrative.ts`, `src/ui.ts`, `src/styles.css`): 8 major story events now present as multi-panel cinematic overlays that pause the game. Spacebar/Enter advances panels, Escape skips. Tier 1 elimination scenes trigger when player relationship > 20.
- **NPC approach system** (`src/approach.ts`, `src/ui.ts`, `src/styles.css`): NPCs proactively approach the player with LLM-generated opening lines. 8 approach types with priority ordering. Approach banner offers Reply (full chat), Nod (+3 relationship), Ignore (-2 relationship), with 30-second auto-dismiss.
- **Walker dossier** (`src/ui.ts`, `src/styles.css`): Clicking a walker name now opens an info panel (name, archetype, relationship, conversation count, alliance status, warnings, revealed facts) with a Talk button to open LLM chat.
- **Absence effects** (`src/narrative.ts`): Ghost references appear for 2-30 miles after Tier 1 deaths — "You look left to say something to Baker. Then you remember."
- **Decline narratives** (`src/engine.ts`): Tier 1 walkers show visible deterioration 5-15 miles before elimination.

### Client — Enhanced Systems
- **Arc-aware overheards** (`src/overhear.ts`): NPC_RELATIONSHIPS (8 arcs, ~25 stages) are checked before random pair selection. Multi-stage arcs include "Previously..." context so the LLM knows what happened before.
- **Conversation tracking** (`src/ui.ts`, `src/engine.ts`, `src/crises.ts`): conversationCount incremented on chat close, revealedFacts populated from LLM info tool calls, playerActions tracked when sharing food/water or helping in crises.
- **Arc context in LLM calls** (`src/ui.ts`, `src/agentClient.ts`): Game context sent to LLM agents now includes arc phase, prompt hints, conversation count, revealed facts, and player actions.

### Client — Types & Data
- **Types** (`src/types.ts`): Added ScenePanel, ActiveScene, ApproachState, WalkerArcStage, NPCRelationship, NPCRelationshipStage interfaces. Extended GameState and WalkerState with all new fields.
- **Walker data** (`src/data/walkers.ts`): All 9 Tier 1 walkers now have 5 arc stages, decline narratives, and elimination scene panels. 8 NPC relationship arcs with ~25 total stages defined.
- **State initialization** (`src/state.ts`): All new fields properly initialized.

### Server
- **Approach endpoint** (`server/index.ts`): New `/api/approach` SSE streaming endpoint. Creates a one-shot Agent with walker personality and approach context, generates 1-2 sentence opening lines.
- **Arc context injection** (`server/prompts.ts`): `buildGameContextBlock()` now includes "Your Arc with This Player" section with phase, hint, alliance status, shared facts, and player actions.

### Infrastructure
- **New files**: `src/approach.ts` (approach trigger system), `src/crises.ts` (crisis resolution), `src/overhear.ts` (arc-aware overheards)
- **Changelog**: v0.4.0 entry added

## Why These Changes Were Made

The user's explicit goal: "playing this game should feel like getting to know the characters from the book." The game had mechanics but lacked soul. Characters were passive, story moments were forgettable, and relationships felt shallow. Drawing from design inspiration (80 Days, Walking Dead, Firewatch, Disco Elysium, This War of Mine, Undertale), we designed and implemented systems that create emotional investment through proactive NPC behavior, unmissable cinematic moments, evolving character relationships, and meaningful consequences for character loss.

## What Must Happen Next

1. **Playtest first 50 miles**: Expect ~2 NPC approaches, ~3 overheards (at least 1 arc-aware), 1-2 scene overlays (first_elim_shock at mile 8, barkovitch_incident at mile 18)
2. **Playtest to mile 200**: Verify arc progression works (walkers should feel different in "vulnerability" phase vs "introduction"), elimination scenes trigger for Tier 1 deaths, absence effects appear after deaths
3. **Verify overlay stacking**: Trigger crisis + scene + approach near-simultaneously; crisis should take priority, scene should queue, approach should auto-dismiss
4. **Populate crisis events**: `src/crises.ts` has the resolution system but may need actual crisis event definitions if not already populated
5. **Tune timing**: Approach auto-dismiss (30s), approach mile gaps (5/3/2 by act), overheard mile gaps (8), absence effect window (2-30 miles) — all may need adjustment based on feel

## Decisions Made (Do Not Re-Debate)

- **8 approach types with fixed priority**: arc_milestone (10) > elimination_reaction (9) > warning_check (8) > vulnerability (7) > offer_alliance (6) > crisis_aftermath (5) > introduction (3). This ensures story-critical moments fire before ambient flavor.
- **Scene overlays pause the game**: Major story moments must not be missed. Player advances at their own pace.
- **Reply/Nod/Ignore for approaches**: Low-friction response options. Players who want deep engagement can Reply; players who want to keep walking can Nod. Forced engagement would feel punishing.
- **Click walker → dossier → Talk**: Provides context before conversation. Shows what you already know. The direct-chat pattern was replaced.
- **All LLM features degrade gracefully**: When server is offline, scenes still show scripted panels, approaches don't fire, overheards fall back to existing system.
- **3% per-mile chance for absence effects**: Sparse enough to be surprising, window long enough (2-30 miles) for lasting emotional impact.

## Explicitly Deferred

- **Proximity approach type**: Listed in the 8 approach types but not yet implemented (would need position-change tracking)
- **Optional LLM reaction panels after scripted scenes**: Plan mentioned generating a Tier 1 walker's reaction as a final scene panel, but not implemented — keeps scenes predictable and cost-controlled
- **Tier 2 walker arc stages**: Architecture supports it, but no arc stage data defined for any Tier 2 walker yet
- **Scene LLM reactions for elimination**: Plan mentioned an LLM call after Tier 1 elimination scenes — not implemented

## Known Risks

- **LLM cost ~doubles**: Approach system adds ~30-60 additional LLM calls per full playthrough
- **Overlay z-index edge cases**: Multiple overlays triggering in the same frame could have stacking issues
- **Decline narrative timing**: Fires based on `eliminationMile` set at state init — if a walker survives longer than expected, decline narratives may fire too early
- **Crisis system completeness**: `src/crises.ts` has resolution logic but crisis event definitions may need more population
- **Untested at scale**: No full playthrough has been done with all 6 systems active simultaneously

## Key Files Modified

| File | Change |
|---|---|
| `src/types.ts` | Added ~155 lines: scene, approach, arc, crisis interfaces + extended GameState/WalkerState |
| `src/state.ts` | Initialize all new state fields |
| `src/data/walkers.ts` | +225 lines: arc stages, decline narratives, elimination scenes, NPC_RELATIONSHIPS |
| `src/narrative.ts` | +398 lines: 8 events → scene overlays, checkAbsenceEffects() |
| `src/ui.ts` | +421 lines: scene overlay, approach banner, dossier, arc context, conversation tracking |
| `src/styles.css` | +432 lines: scene, approach, dossier CSS with animations |
| `src/engine.ts` | +135 lines: elimination scenes, decline narratives, warning/action tracking |
| `src/main.ts` | +70 lines: scene pause, absence effects, approach checks, keyboard handlers |
| `src/approach.ts` | New file: NPC approach trigger system (~230 lines) |
| `src/crises.ts` | New file: crisis resolution with player action tracking |
| `src/overhear.ts` | New file: arc-aware ambient overheard system (~230 lines) |
| `src/agentClient.ts` | +129 lines: arc context fields, requestApproach() |
| `server/index.ts` | +211 lines: /api/approach endpoint + /api/overhear endpoint |
| `server/prompts.ts` | +29 lines: arc context injection in buildGameContextBlock |
| `docs/CHANGELOG.md` | v0.4.0 entry |
