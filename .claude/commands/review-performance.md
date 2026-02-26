Review performance characteristics of this codebase.

## Context
Read these files first:
- `.claude/CLAUDE.md` — Render throttling, HTML caching, append-only patterns
- `src/main.ts` — Game loop and render scheduling
- `src/ui.ts` — DOM rendering, HTML caching, overlay management
- `src/engine.ts` — Tick simulation for 99 walkers
- `src/visualization.ts` — Canvas rendering for 100+ dots
- `src/audio.ts` — Web Audio generative music
- `src/data/walkers.ts` — Walker roster data size
- `src/narrative.ts` — Scripted events and checks per tick

## What to Check

1. **Render throttling**: Verify `src/main.ts` enforces the 200ms interval for game screen renders. Check that non-game screens render immediately (no unnecessary throttling on menu/setup screens).

2. **HTML caching effectiveness**: In `src/ui.ts`, verify ALL panels that use `innerHTML` have cache variables and string comparison guards:
   - `cachedWalkersHtml` — walker list panel
   - `cachedActionsHtml` — action buttons
   - `cachedControlsHtml` — speed controls
   - `cachedDialogueHtml` — dialogue panel
   - `cachedCrisisHtml` — crisis overlay
   - `cachedSceneHtml` — scene overlay
   - `cachedApproachHtml` — approach banner
   Check for any `innerHTML` assignments that LACK a cache guard — these cause DOM rebuild every 200ms.

3. **Game tick cost**: Read the tick function in `src/engine.ts`. It iterates 99 walkers every tick. Check for:
   - O(n^2) operations (e.g., walkers checking distance to all other walkers)
   - Expensive computations inside the walker loop that could be hoisted
   - Unnecessary object allocations per tick (garbage collection pressure)

4. **Canvas performance**: Read `src/visualization.ts`. For 100+ dots:
   - Is `clearRect` + full redraw used each frame, or are dirty regions tracked?
   - Are walker positions pre-computed or recalculated per draw call?
   - Is the canvas resolution matched to device pixel ratio?
   - Are text labels (walker names for Tier 1) drawn efficiently?

5. **Narrative check overhead**: In `src/main.ts`, narrative triggers are checked every tick: scripted events, overheards, ambient overheards, hallucinations, absence effects, approaches, crises. Verify these checks are O(1) or O(n) with small n, not scanning large arrays.

6. **Audio performance**: Read `src/audio.ts`. Web Audio nodes should be:
   - Created once and reused (not created per tick)
   - Properly disconnected when no longer needed
   - Using `AudioParam.setTargetAtTime()` or similar for smooth transitions (not per-frame `value` assignment)

7. **SSE streaming efficiency**: In `src/agentClient.ts`, check the SSE parser. Verify it doesn't buffer the entire response before parsing — it should process chunks incrementally.

8. **Memory leaks**:
   - Does `narrativeLog` in GameState grow unbounded over a 400-mile playthrough? Estimate: ~2-4 entries per mile = 800-1600 entries.
   - Does the append-only DOM log in `src/ui.ts` accumulate thousands of DOM nodes?
   - Are event listeners properly cleaned up when overlays close?
   - Does `server/agents.ts` history cache grow if many walkers are talked to? (Should cap at 20 messages per walker)

9. **Bundle size**: Check `package.json` dependencies. The client should be lightweight:
   - `@openai/agents` and `hono` should be server-only (not bundled into client)
   - Verify Vite tree-shaking isn't pulling server code into the client bundle
   - `src/data/walkers.ts` is 48KB of data — is it all needed at startup?

10. **Approach/overhear system cost**: `src/approach.ts` checks 8 approach types with priority. `src/overhear.ts` scans NPC_RELATIONSHIPS. Verify these don't do expensive work when no approach/overhear is due (should early-return based on mile gaps).

## Anti-Patterns to Flag
- `innerHTML` without cache guard (DOM thrashing at 5 FPS)
- `document.querySelectorAll` inside render loops
- Creating new objects/arrays inside per-tick functions
- Canvas `fillText` for every walker every frame (expensive)
- Unbounded array growth without cleanup strategy
- Audio node creation inside animation frames
- `JSON.stringify`/`JSON.parse` in hot paths

## Output Format
Report findings as:
- **CRITICAL**: [issue] — [file:line] — [why it matters]
- **WARNING**: [issue] — [file:line] — [recommendation]
- **INFO**: [observation] — [file:line]

End with: Summary paragraph + Top 3 recommended actions.
