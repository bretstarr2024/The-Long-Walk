Review game logic, simulation correctness, and gameplay balance.

## Context
Read these files first:
- `src/engine.ts` — Core simulation: tick, NPC updates, warnings, elimination, position transitions (863 lines — read in full)
- `src/crises.ts` — Crisis types, triggering, resolution, player actions (726 lines)
- `src/approach.ts` — NPC approach triggers and priority system (288 lines)
- `src/narrative.ts` — Scripted events, scene triggers, hallucinations, absence effects (695 lines)
- `src/overhear.ts` — Arc-aware overheard selection (229 lines)
- `src/data/walkers.ts` — Walker roster, elimination miles, arc stages, relationships
- `src/data/route.ts` — Route segments, crowd phases, terrain
- `src/types.ts` — Enums for CrisisType, ApproachType, ArcPhase, BehavioralState

## What to Check

1. **Warning system correctness**: In `src/engine.ts`:
   - NPCs below 4.0 mph receive warnings with 5 game-minute minimum spacing
   - 3 warnings = elimination (no exceptions)
   - Warning backstop: walkers past elimination mile gradually slow down
   - Hard backstop at +8 miles past elimination mile
   - Player uses the same warning rules
   - Verify no path where a walker is eliminated without receiving 3 warnings

2. **Elimination ordering**: Check `src/data/walkers.ts` elimination miles:
   - Do they produce a reasonable elimination curve (more deaths in later miles)?
   - Are Tier 1 eliminations spaced far enough apart for story impact?
   - Does the final survivor calculation work correctly?
   - What happens if the player is eliminated? (Should trigger an ending)

3. **Speed and stamina model**: In `src/engine.ts`:
   - Player speed affects stamina drain rate
   - Stamina recovery when speed is lowered
   - Speed below 4.0 mph triggers warnings
   - Position changes have speed boost (+0.8 mph) and stamina cost (-2)
   - Verify the math: can a player reasonably survive 400 miles with optimal play?

4. **Crisis system balance**: In `src/crises.ts`:
   - 10+ crisis types with different triggers (stamina, hydration, miles, random)
   - Timed decisions with gameplay consequences
   - Verify crisis frequency is reasonable (not too frequent or too rare)
   - Check that crisis resolution properly applies stat effects
   - Verify `playerActions` are tracked correctly for LLM context

5. **Approach priority system**: In `src/approach.ts`:
   - 8 approach types with priority: arc_milestone(10) > elimination_reaction(9) > warning_check(8) > vulnerability(7) > offer_alliance(6) > crisis_aftermath(5) > introduction(3) > proximity(1)
   - Mile gaps: Act 1=5mi, Act 2=3mi, Act 3-4=2mi
   - Verify no approach type can fire before its conditions are met
   - Check that eliminated walkers can't trigger approaches

6. **Scene trigger correctness**: In `src/narrative.ts`:
   - 8 scripted scenes with mile triggers
   - Tier 1 elimination scenes (relationship > 20)
   - Verify scenes can't trigger twice (`triggeredEvents` tracking)
   - Check scene panel data completeness (no empty panels)
   - Game must pause during scenes

7. **Overheard system**: In `src/overhear.ts`:
   - Arc-aware selection: NPC_RELATIONSHIPS checked first, random pairs second
   - 8-mile minimum gap between any overheards
   - "Previously..." context injection for multi-stage arcs
   - Verify both walkers in a pair must be alive
   - Check that overheard mile triggers in NPC_RELATIONSHIPS are monotonically increasing

8. **Absence effect correctness**: In `src/narrative.ts`:
   - Ghost references for 2-30 miles after Tier 1 deaths
   - 3% per-mile chance
   - Verify the walker must actually be dead (not just warned)
   - Check absence messages reference the correct walker name

9. **Decline narrative timing**: In `src/engine.ts`:
   - Decline narratives fire 5-15 miles before elimination
   - Verify they don't fire after the walker is already eliminated
   - Check that `lastDeclineMile` tracking prevents spam

10. **Act/horror progression**: In `src/engine.ts` and `src/data/route.ts`:
    - Act transitions (1→2→3→4) at correct mile thresholds
    - Horror tier increases affect NPC behavior
    - Crowd density changes along the route
    - Weather/terrain changes affect gameplay

## Anti-Patterns to Flag
- Walkers eliminated without receiving 3 warnings
- Crises that can trigger during scene overlays (should be blocked)
- Approaches from dead walkers
- Overheards between walkers who are both dead
- Arc stages with unreachable `minConversations` requirements
- Stat values that can go below 0 or above 100 without clamping
- Elimination miles that cluster too tightly (multiple deaths in same mile)
- Game speed multiplier that allows skipping event triggers

## Output Format
Report findings as:
- **CRITICAL**: [issue] — [file:line] — [why it matters]
- **WARNING**: [issue] — [file:line] — [recommendation]
- **INFO**: [observation] — [file:line]

End with: Summary paragraph + Top 3 recommended actions.
