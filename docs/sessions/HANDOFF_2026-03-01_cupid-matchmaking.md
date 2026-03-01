# Session Handoff: Cupid Matchmaking

**Date:** 2026-03-01
**Session ID:** 2026-03-01-cupid-matchmaking
**Version:** 0.10.0
**Branch:** main

---

## Where We Are

The Long Walk is at v0.10.0, deployed to Railway production. The game now features a Cupid matchmaking system — a new player action that lets the player make NPCs fall in love with each other. This was requested by the user's daughter, who wants to play as Cupid during the 400-mile death march.

The Cupid system is fully implemented: a two-step walker picker in the actions panel, three-stage romantic progression (spark → crush → love) over miles walked, LLM-generated romantic overheard conversations via speech bubbles, pink dashed lines with heart icons on the green phosphor radar, couple morale boosts, and heartbreak narratives when a matched walker dies. No server changes were needed — the existing `/api/overhear` endpoint's `scenePrompt` parameter carries all the romantic context.

The feature has not been playtested yet. Additionally, the v0.9.2 fixes (scroll direction, crowd noise volume, player death gunshot) from the prior session still await playtesting.

## What Changed This Session

### Client
- **New `src/cupid.ts` module** — Core matchmaking logic: `createCupidMatch()`, `checkCupidOverheards()`, `updateCupidCouples()`, `handleCupidHeartbreak()`, `getCupidMatch()`, `resetCupidGlobals()`. Contains 3 romantic scene prompts per stage (9 total), stage advancement logic, and heartbreak narratives
- **`src/types.ts`** — Added `CupidStage` type, `CupidMatch` interface, `cupidMatches: CupidMatch[]` on `GameState`, `lastCupidMile: number` on `PlayerState`
- **`src/state.ts`** — Initialized `cupidMatches: []` and `lastCupidMile: -20` in state constructors
- **`src/ui.ts`** — Added cupid heart-arrow SVG icon to `ICON` object. Added `cupidPickerPhase` and `cupidFirstPick` module state for the two-step picker. Added `handleCupid()` handler and `'cupid'` case in `handleAction`. Extended `data-pick-walker` click handler to intercept cupid picker phases. Added cupid picker rendering + button in `updateActionsPanel`. Added match display in `renderDossier`. Imported `createCupidMatch` and `getCupidMatch` from cupid.ts
- **`src/visualization.ts`** — Added pink dashed lines (`rgba(255, 100, 180)`) between matched pairs with sine-wave pulse. Bezier-curve heart icons at midpoint for crush/love stages, scaling with stage
- **`src/engine.ts`** — Imported and called `handleCupidHeartbreak()` in `eliminateWalker()` after bonded-ally block. Imported and called `updateCupidCouples()` in `gameTick()` after `updateWalkTogether`
- **`src/main.ts`** — Imported and called `checkCupidOverheards()` from game loop after `checkAmbientOverhear()`
- **`src/narrative.ts`** — Added "Matches Made" to game over stats
- **`src/styles.css`** — Added `.si-cupid { color: #ff69b4; }` (hot pink)

### Server
- No changes. Romantic context conveyed entirely through scene prompts to existing `/api/overhear` endpoint.

### Infrastructure
- Deployed v0.10.0 to Railway production, health check passing

## Why These Changes Were Made

The user's daughter wants the power to make NPCs fall in love with each other during the death march. The Cupid feature adds a whimsical, emotionally engaging mechanic that contrasts with the game's dark setting — love amid horror. The design reuses existing systems (overhear LLM pipeline, speech bubbles, visualization, action panel patterns) to minimize new code while delivering a complete feature.

## What Must Happen Next

1. **Playtest the Cupid feature** — verify button gating (mile 15+, cooldown, max 3), two-step picker flow, romantic overheard quality, radar line rendering, stage transitions, and heartbreak
2. **Playtest v0.9.2 fixes** — scroll direction, vertical grade inclinometer, crowd noise volume
3. **Test player death gunshot timing** — verify 3.5s delay works with warning voice
4. **Consider wiring up conversationFlags** — `set_flag` agent tool writes flags but client never reads them

## Decisions Made (Do Not Re-Debate)

- **Action panel button** — Cupid is a standalone action (like Talk, Stretch, Observe), not a chat overlay social action. Uses two-step walker picker: pick A, then pick B
- **Full 3-stage progression** — spark (0-20mi), crush (20-60mi), love (60+mi). User explicitly chose this over simpler one-shot matching
- **No server changes** — romantic prompts passed via the existing `scenePrompt` parameter. No new endpoints
- **Pink on green radar** — deliberately breaks monochrome palette for thematic contrast
- **Gender-agnostic** — no gender field in walker data, prompts use "romantic connection" without gendered terms
- **Max 3 active matches, 15-mile cooldown** — balances fun vs. overwhelming

## Explicitly Deferred

- **Heartbroken match visual** — fading/dimmed pink line after partner death. Listed as polish item
- **conversationFlags wiring** — `set_flag` tool writes flags but client never reads them (carry-forward from v0.9.1)
- **Playtest pass** — carried forward from v0.9.2

## Known Risks

- Cupid feature entirely unplaytested — UI, prompt quality, heartbreak timing all need validation
- Crowd noise 3x volume boost (v0.9.2) not yet playtested
- `npm run validate` still fails on Node.js 25.6.1 (pre-existing `import.meta.env` issue, not blocking)

## Key Files Modified

| File | Change |
|------|--------|
| `src/cupid.ts` | **NEW** — Core matchmaking module (264 lines) |
| `src/types.ts` | `CupidStage`, `CupidMatch` types, new state fields |
| `src/state.ts` | State initialization |
| `src/ui.ts` | Icon, button, two-step picker, dossier display (+84 lines) |
| `src/visualization.ts` | Pink lines + heart icons (+35 lines) |
| `src/engine.ts` | Heartbreak + couple morale integration (+7 lines) |
| `src/main.ts` | Game loop integration (+4 lines) |
| `src/narrative.ts` | Game over stat (+1 line) |
| `src/styles.css` | `.si-cupid` color (+1 line) |
| `docs/CHANGELOG.md` | v0.10.0 entry |
