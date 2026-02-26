Review the frontend rendering, DOM management, and UI patterns in this codebase.

## Context
Read these files first:
- `.claude/CLAUDE.md` — Event delegation, HTML caching, stable DOM, append-only patterns
- `src/ui.ts` — All rendering and event handling (1,633 lines — read in full)
- `src/main.ts` — Game loop, keyboard handlers, render scheduling
- `src/visualization.ts` — Canvas bird's-eye view
- `src/styles.css` — All styling, overlay z-indexes, animations
- `src/types.ts` — UI-relevant types (ActiveScene, ApproachState, ActiveDialogue)

## What to Check

1. **Event delegation integrity**: The single click handler on `#app` must handle ALL interactive elements via `data-action` attributes. Search `src/ui.ts` for:
   - Any `addEventListener('click', ...)` on dynamic elements (violation)
   - Any inline `onclick` in HTML strings (violation)
   - All `data-action` values have corresponding handler cases
   - Event handler properly uses `closest('[data-action]')` to find the action element

2. **Stable DOM pattern compliance**: These panels must use create-once + targeted updates:
   - Status panel (stamina, hydration, speed display)
   - LLM chat overlay (message list, input field, streaming indicator)
   - Walker dossier panel
   Verify they use `getElementById` + `.textContent`/`.style` updates, NOT `innerHTML` rebuilds.

3. **HTML caching completeness**: Every `innerHTML` assignment in `src/ui.ts` must have a corresponding cache variable and comparison guard. List ALL `innerHTML` assignments and check each one.

4. **Append-only narrative log**: Verify `renderedNarrativeCount` tracking:
   - New entries appended as DOM elements (not full rebuild)
   - Auto-scroll to bottom after append
   - No innerHTML rebuild of the narrative panel

5. **Overlay z-index stacking**: Per MEMORY.md: Crisis (z-150) > Scene (z-200) > Approach (z-120) > Dossier. Read `src/styles.css` and verify:
   - Z-indexes are correctly ordered for priority
   - Only one overlay is visible at a time (or proper stacking when multiple trigger)
   - Escape key closes the topmost overlay
   - Background click closes appropriate overlays

6. **Keyboard accessibility**: In `src/main.ts`, verify:
   - Space/Enter advance scene panels
   - Escape closes overlays (scene, chat, dossier, approach)
   - Speed controls (1-4, arrow keys) work during gameplay
   - Keyboard shortcuts don't fire when chat input is focused
   - No keyboard traps (every overlay has an exit)

7. **Scene overlay rendering**: Read the scene rendering code in `src/ui.ts`:
   - Panels advance correctly (Space/Enter)
   - Current panel indicator shows progress
   - Game is paused during scenes
   - Scene closes properly on last panel or Escape

8. **Approach banner UX**: Verify the approach banner in `src/ui.ts`:
   - Shows walker name + LLM-generated opening line
   - Three response buttons: Reply, Nod, Ignore
   - 30-second auto-dismiss timer
   - Streaming text renders incrementally
   - Banner doesn't interfere with other UI elements

9. **Chat overlay streaming**: The LLM chat overlay must:
   - Show a streaming indicator while waiting
   - Append tokens incrementally (not rebuild)
   - Promote streaming element to final message on `done` event
   - Handle errors gracefully (show error message, allow retry)
   - Close cleanly (Escape, X button, background click)

10. **Responsive layout**: Check `src/styles.css` for:
    - Fixed-width assumptions that break on small screens
    - Overlay positioning (centered? full-screen? scrollable?)
    - Text overflow handling in narrative log, walker list, chat messages
    - Canvas sizing in `src/visualization.ts` (responsive to container?)

## Anti-Patterns to Flag
- `innerHTML` without HTML cache guard (DOM flicker at 5 FPS)
- `addEventListener` on dynamically created elements (memory leak, bypasses delegation)
- `document.querySelector` in render loops (should cache references)
- Inline styles in HTML strings that should be CSS classes
- Missing `textContent` sanitization for user/LLM-generated text rendered via `innerHTML`
- Hardcoded pixel dimensions instead of responsive units
- Z-index values that don't match the documented stacking order

## Output Format
Report findings as:
- **CRITICAL**: [issue] — [file:line] — [why it matters]
- **WARNING**: [issue] — [file:line] — [recommendation]
- **INFO**: [observation] — [file:line]

End with: Summary paragraph + Top 3 recommended actions.
