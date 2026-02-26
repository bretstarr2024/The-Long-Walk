Review the architecture and structural decisions of this codebase.

## Context
Read these files first to understand the project conventions:
- `.claude/CLAUDE.md` — Project rules and architecture patterns
- `src/types.ts` — All type definitions and interfaces
- `src/main.ts` — Entry point, game loop, event wiring
- `src/state.ts` — State initialization and accessors
- `package.json` — Dependencies and scripts

## What to Check

1. **Module boundaries**: Verify each file in `src/` has a single responsibility. Check that `src/ui.ts` (1,633 lines) hasn't become a god module — rendering, event handling, overlay logic, and LLM context building should have clear internal boundaries or be split.

2. **Dependency flow**: Map the import graph. Client files (`src/`) must NEVER import from `server/`. Server files (`server/`) must NEVER import client-specific code. Shared types should live in `src/types.ts` only.

3. **State shape**: Read `src/types.ts` (GameState, PlayerState, WalkerState) and `src/state.ts`. Verify no state duplication — each piece of data should have exactly one source of truth. Check that `GameState` isn't growing unbounded fields.

4. **Event delegation pattern**: Read the click handler in `src/ui.ts`. All interactive elements must use `data-action` attributes — verify no inline `onclick` handlers or direct `addEventListener` calls on dynamic elements.

5. **Render architecture**: Verify the render throttling pattern (200ms for game screen, immediate for others) in `src/main.ts`. Check that `src/ui.ts` uses HTML caching (string comparison before `innerHTML` assignment) consistently for all panels.

6. **Client-server contract**: Compare the request/response shapes in `src/agentClient.ts` with the endpoint handlers in `server/index.ts`. Verify they agree on:
   - Endpoint paths (`/api/chat/:walkerId`, `/api/overhear`, `/api/approach`, `/api/health`)
   - Request body shapes (walker profile, game context fields)
   - SSE event names and payload shapes (`token`, `effect`, `done`, `error`)

7. **Tier system consistency**: Verify that Tier 1/2/3 walker behavior is properly gated throughout:
   - `src/engine.ts` — elimination scenes only for Tier 1
   - `src/approach.ts` — approaches only from Tier 1/2
   - `src/overhear.ts` — overheards respect tier boundaries
   - `src/visualization.ts` — dot sizes match tier
   - `src/data/walkers.ts` — all 9 Tier 1 walkers have complete data (arcStages, declineNarratives, eliminationScene)

8. **Graceful degradation**: Verify all LLM-dependent features handle server-offline state. Per CLAUDE.md: "All LLM features degrade gracefully when server is offline." Check `src/ui.ts`, `src/approach.ts`, `src/overhear.ts`, `src/narrative.ts`.

9. **New file justification**: `src/approach.ts`, `src/crises.ts`, `src/overhear.ts` were added in v0.4.0. Verify they don't duplicate logic that already exists in `src/engine.ts` or `src/narrative.ts`.

10. **Circular dependencies**: Check for circular import chains between `src/ui.ts`, `src/engine.ts`, `src/main.ts`, `src/narrative.ts`, and `src/state.ts`.

## Anti-Patterns to Flag
- Direct DOM manipulation outside `src/ui.ts` (violation of rendering boundary)
- `innerHTML` assignment without HTML cache comparison (causes DOM flicker)
- Inline event listeners on dynamically created elements (should use delegation)
- `any` type usage — strict mode is enabled, `any` should be rare and justified
- Server imports in client code or vice versa
- State mutations outside `src/engine.ts` tick cycle (except UI-initiated state like `activeDialogue`)

## Output Format
Report findings as:
- **CRITICAL**: [issue] — [file:line] — [why it matters]
- **WARNING**: [issue] — [file:line] — [recommendation]
- **INFO**: [observation] — [file:line]

End with: Summary paragraph + Top 3 recommended actions.
