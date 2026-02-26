Review data integrity and state consistency across this codebase.

## Context
Read these files first:
- `src/types.ts` — All type definitions (GameState, WalkerState, PlayerState)
- `src/state.ts` — State initialization
- `src/engine.ts` — State mutations in tick cycle
- `src/data/walkers.ts` — Walker roster, arc stages, NPC relationships
- `src/ui.ts` — UI-initiated state mutations (chat close, dossier, approach response)
- `src/crises.ts` — Crisis state mutations
- `src/approach.ts` — Approach triggering and state

## What to Check

1. **State initialization completeness**: Compare `src/types.ts` interfaces against `src/state.ts` initialization. Every field in `GameState`, `PlayerState`, and `WalkerState` must have an explicit initial value. Missing initializations cause runtime `undefined` errors.

2. **Walker data completeness**: In `src/data/walkers.ts`, verify:
   - All 9 Tier 1 walkers have: `arcStages` (5 phases), `declineNarratives`, `eliminationScene` panels
   - All Tier 1 walkers are referenced correctly by `number` in `NPC_RELATIONSHIPS`
   - Walker numbers in roster match walker numbers used in `src/engine.ts` elimination logic
   - No duplicate walker numbers in the 99-walker roster

3. **Arc stage consistency**: For each Tier 1 walker's `arcStages`:
   - Mile ranges should be monotonically increasing and non-overlapping
   - `minConversations` should be achievable within the mile range
   - Arc phases should follow the sequence: introduction → opening_up → vulnerability → crisis → farewell
   - `promptHint` strings should be non-empty

4. **NPC relationship arc integrity**: In `src/data/walkers.ts`, verify `NPC_RELATIONSHIPS`:
   - Both walkers in each relationship exist in the roster
   - Stage mile triggers are monotonically increasing
   - `previousContext` for later stages references earlier stage content
   - No relationship references a Tier 3 walker (they have no dialogue)

5. **Elimination mile ordering**: Walker `eliminationMile` values in the roster should spread across the 400-mile route. Check for:
   - No two Tier 1 walkers eliminated at the same mile (would cause overlapping scenes)
   - Tier 1 eliminations roughly match the novel's sequence
   - `declineNarratives` mile ranges fall before `eliminationMile`

6. **State mutation discipline**: State should primarily be mutated in `src/engine.ts` tick. Catalog all other mutation sites:
   - `src/ui.ts`: `conversationCount`, `activeDialogue`, `llmDialogue`, `activeScene`, `activeApproach`
   - `src/crises.ts`: `activeCrisis`, `playerActions`, `tempEffects`
   - `src/approach.ts`: `activeApproachState`, `lastApproachMile`
   - `src/narrative.ts`: `narrativeLog`, `triggeredEvents`, `activeScene`
   Verify no conflicting mutations (two systems writing the same field without coordination).

7. **Race conditions**: Multiple async operations can be in flight:
   - LLM chat streaming (`src/agentClient.ts`)
   - Approach streaming
   - Overhear streaming
   - Scene overlay active
   Check that the game properly prevents conflicting states (e.g., opening a chat while a scene overlay is active, or two approaches triggering simultaneously).

8. **Warning system integrity**: In `src/engine.ts`:
   - Warnings are spaced 5 game-minutes apart (backstop)
   - 3 warnings = elimination
   - Warning count is never accidentally reset
   - Player warnings use the same system as NPC warnings

9. **Conversation history bounds**: In `server/agents.ts`:
   - History is capped at 20 messages per walker
   - Verify `addToHistory()` trims correctly (keeps most recent, not oldest)
   - Check that trimming doesn't corrupt the alternating user/assistant pattern

10. **Numeric bounds**: Check for potential overflows or invalid ranges:
    - `relationship`: should be clamped to [-100, 100]
    - `stamina`, `hydration`, `hunger`, `pain`, `morale`, `clarity`: should be [0, 100]
    - `speed`: should have valid bounds
    - `warnings`: should be [0, 3]
    - `gameMinutes` / `milesTraveled`: should be monotonically increasing

## Anti-Patterns to Flag
- Fields in type definitions without corresponding initialization in `src/state.ts`
- State mutations outside the tick cycle without clear justification
- Walker data with missing or inconsistent arc stages
- Overlapping elimination miles for Tier 1 walkers
- Numeric values without bounds clamping
- Async operations that can corrupt state if interleaved
- History trimming that breaks user/assistant alternation

## Output Format
Report findings as:
- **CRITICAL**: [issue] — [file:line] — [why it matters]
- **WARNING**: [issue] — [file:line] — [recommendation]
- **INFO**: [observation] — [file:line]

End with: Summary paragraph + Top 3 recommended actions.
