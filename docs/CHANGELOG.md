# Changelog

## 0.10.1 — 2026-03-01

Full 8-category audit remediation — 3 criticals, 6 warnings fixed across 7 files.

### Critical Fixes
- **NPC walk-off race condition**: NPCs queued in `pendingEliminations` (8s death delay) could walk off a warning during the delay at high game speeds, creating inconsistent state. Added `pendingEliminations.has()` guard to walk-off timer
- **Alliance UI acceptance bug**: When relationship was 50-59, the "accepted" branch could fire but `formAlliance()` silently rejected (hard gate at 60). Player saw acceptance dialogue with no alliance formed. Now checks return value and shows rejection if engine gate fails
- **Cupid viz O(n) regression**: `state.walkers.find()` in per-frame cupid match rendering replaced with O(1) `getWalkerState()` map lookup

### Game Balance
- **Effort dead zone closed**: Effort 40-49% had implicit 1.0x drain modifier (worse than both <40% at 0.6x and 50-57% at 0.7x). Added 0.8x modifier for 40-49% range — drain curve is now monotonically sensible
- **Bowel emergency crisis**: New `bowel_emergency` crisis auto-triggers at bowel=100, mirroring bladder's `bathroom_emergency`. Options: hold (+5 pain), go (-15 morale, 2 warnings), ally cover (1 warning, -3 ally stamina). 25s timer, speed override 3.0
- **Pee/poop buttons disabled by warnings**: Pee button disabled at 2+ warnings, poop at 1+ warnings. Shows "(too risky)" label instead of silently failing on click

### Security
- **Walker name escaping**: Added `escapeHtml()` to 8 innerHTML sites with walker names (walkers panel, dossier, picker, cupid picker, share divider, approach intro, cupid match). Low risk (static data) but closes defense-in-depth gap
- **Prompt injection hardening**: Player messages stripped of `[GAME STATE]` and `[PLAYER SAYS]` delimiter markers before embedding in LLM input, preventing delimiter injection attacks

### Performance
- **Audio node leak fixed**: Chord crossfade now explicitly disconnects `BiquadFilterNode` and `GainNode` after fade-out. Previously leaked ~2,250 orphaned node pairs per hour of gameplay

## 0.10.0 — 2026-03-01

Cupid matchmaking — player can make NPCs fall in love with each other.

### New Feature: Cupid Matchmaking
- **Play Cupid action**: New button in the actions panel lets the player pick two nearby Tier 1/2 walkers and spark a romance between them. Two-step picker: choose Walker A, then Walker B
- **Romantic progression**: Matches deepen over miles walked — Spark (0-20 miles, shy glances), Crush (20-60 miles, walking closer), In Love (60+ miles, tender moments). Stage transitions produce narrative entries
- **LLM romantic overheards**: Matched pairs get romantic overheard conversations every ~12 miles, displayed as speech bubbles. Uses existing `/api/overhear` endpoint with romantic scene prompts — no server changes needed. 3 unique prompts per stage, randomly selected
- **Pink radar lines**: Pulsing pink dashed lines connect matched pairs on the green phosphor radar. Crush/Love stages show a bezier-curve heart icon at the midpoint, scaling with stage
- **Couple morale boost**: Matched pairs walking in the same position boost each other's morale (+1/mile spark, +2/mile crush, +3/mile love)
- **Heartbreak**: When a matched walker is eliminated, the surviving partner suffers morale devastation scaling with stage (-10 spark, -20 crush, -35 love), with a unique heartbreak narrative. Player also loses -10 morale
- **Dossier integration**: Walker dossier shows match status ("Matched with [Name] (Spark/Crush/In Love)")
- **Game over stat**: "Matches Made" shown on the game over screen
- **Gating**: Minimum mile 15, 15-mile cooldown between matchmaking, max 3 active (non-heartbroken) matches, gender-agnostic

### New File
- `src/cupid.ts` — Core matchmaking module: `createCupidMatch()`, `checkCupidOverheards()`, `updateCupidCouples()`, `handleCupidHeartbreak()`, `getCupidMatch()`, `resetCupidGlobals()`

## 0.9.2 — 2026-02-28

Seven playtest bugs fixed — visualization scrolling, audio, player warnings, and player death gunshot.

### Visualization Fixes
- **Scroll direction reversed**: Terrain, road center dashes, shoulder ticks, and crowd figures now scroll downward (opposite to walker movement). Previously scrolled upward (same direction as walkers), breaking the illusion of forward motion
- **Mile markers scroll with progress**: Markers now smoothly scroll based on fractional mile position instead of snapping to fixed Y positions. Shows 7 markers (±3 miles from current) with continuous movement
- **Center road dashes more visible**: Alpha increased from 0.12 to 0.25, line width from 0.8 to 1.0 — dashes are now clearly visible as the road scrolls past
- **Grade inclinometer redesigned as vertical**: Replaced horizontal bar with a vertical inclinometer (12×66px). 0° at center, uphill at top, downhill at bottom. Bubble indicator moves along the vertical axis with degree label that follows. Labels: UP/DN at ends

### Audio Fixes
- **Crowd noise louder**: Volume levels ~3x increase across all densities (sparse 0.015→0.04, moderate 0.035→0.08, heavy 0.06→0.14, massive 0.09→0.20). Previously inaudible at start of game

### Player Warning/Death Fixes
- **Player warnings now announced**: Fixed bug where warnings from pee/poop actions were silent. Root cause: per-frame narrative snapshot missed entries added by UI click handlers between frames. Replaced with persistent `lastCheckedNarrativeIdx` counter that catches all entries regardless of when they were added
- **Gunshot on player death**: Player now hears a gunshot 3.5s after their final warning (lets warning voice finish). Previously only NPC deaths had gunshots. Uses `playerGunshotFired` flag to fire exactly once, cancels any speech before firing

## 0.9.1 — 2026-02-28

Green phosphor radar visualization overhaul + full 8-category audit remediation (3 criticals, 15 warnings across 12 files).

### Visualization Overhaul — Green Phosphor Radar
- **Complete visual redesign**: Replaced thermal satellite view with CRT green phosphor radar aesthetic — dark background (#0a0a0a), phosphor green (#00ff41) palette, scanline overlay, vignette effect
- **Radar sweep**: Rotating radar sweep line with phosphor glow trail, centered on player position
- **Walker rendering**: Condition-based color coding (bright green → amber → red → dim), pulsing animation for player dot, alliance/enemy ring indicators
- **Terrain strip**: Left-edge terrain profile with phosphor color coding and grade labels
- **Weather FX**: Rain streaks, fog layers, cold tint — all in phosphor green palette
- **Geiger counter audio**: Ambient clicking that intensifies based on nearby walker danger (warnings, low stamina). New `GeigerController` class in audio.ts with proximity-based tick rate
- **CRT CSS effects**: Scanline overlay, text-shadow glow, vignette corners via CSS on visualization container

### Critical Fixes
- **Player warning bypass**: Trip, steal, and retaliate actions incremented `p.warnings++` directly, skipping `totalWarningsReceived`, morale drain, and 3rd-warning death logic. New `issueWarningRaw()` in engine.ts handles all side effects without duplicate narrative
- **Duplicated context builders**: `buildGameContext()` and `buildWalkerProfile()` copied in 3 files (ui.ts, overhear.ts, approach.ts). Extracted to shared `contextBuilder.ts` — ~200 lines of duplication removed
- **Missing arc fallback in approach.ts**: Approach endpoint lacked the two-pass arc phase computation, causing NPC approaches to lose arc context when miles outpaced conversation count. Fixed automatically by shared context builder

### Server Security Hardening
- **Global error handler**: `app.onError()` catches unhandled route errors, returns safe 500
- **CSP + HSTS headers**: Content-Security-Policy and Strict-Transport-Security added to all responses
- **Server-side timeout**: 60s `Promise.race()` timeout on OpenAI `run()` calls in `createSSEResponse()`
- **Zod schema validation**: All 3 endpoints (chat, overhear, approach) validate walker profiles and game context payloads with Zod schemas
- **Approach type whitelist**: Server rejects unknown approach types with 400

### Bug Fixes
- **Elimination scene setTimeout guard**: Added `!state.llmDialogue` check — scenes no longer queue during active LLM chat
- **Visualization O(n) elimination count**: `state.walkers.filter(w => !w.alive).length` → `state.eliminationCount`
- **Alliance strain-break floor**: Relationship floor changed from `Math.max(0,...)` to `Math.max(-100,...)` — broken alliances can now properly become enemies
- **Olson/Barkovitch arc overlaps**: Crisis and farewell mileRanges no longer overlap (Olson: 95-105/105-115, Barkovitch: 230-245/245-255)
- **Stale timing comment**: "2s for dramatic timing" corrected to "8s" in engine.ts

### UX Improvements
- **Dossier dismissible via Escape**: New `closeDossier()` export, added to Escape key priority chain in main.ts
- **Introduction approach window**: Extended from mile 20 to mile 30 (matches Act 1 boundary)
- **Overhear overlay guard**: Ambient overheards blocked during active crisis, dialogue, scene, or approach overlays
- **Write-only flags documented**: TODO comment on `set_flag` tool noting flags are write-only, kept for future use

## 0.9.0 — 2026-02-28

Three deferred features implemented — sweet spot indicator, varied pleading voices, and player death ticket.

### New Features
- **Sweet spot indicator on effort meter**: CSS `::after` pseudo-element renders a subtle green-tinted zone at 58-68% effort on the effort bar, showing the optimal stamina efficiency range. Pure CSS, no JS changes
- **Varied pleading voice per walker**: `playPleading(age?)` now varies Web Speech API pitch and rate by walker age — young walkers (≤17) sound higher and more panicked, older walkers (>25) sound deeper and slower. Walker number parsed from warning text to look up age
- **Player death ticket**: When the player is eliminated, their ticket popup is shown for 5 seconds before transitioning to the gameover screen. Uses the existing ticket queue system — `issueWarning()` pushes a player ticket and sets `playerDeathTime` instead of immediately switching to gameover. Game simulation freezes during the ticket display

### Fix
- **Game over warnings stat reverted**: "Warnings Received" restored to `totalWarningsReceived` (lifetime count including walked-off warnings) per user preference

## 0.8.5 — 2026-02-27

Playtest fixes — ticket stacking, observe cooldown, warning reaction timing, game over stat accuracy.

### Bug Fixes
- **Warning reaction bubbles only on elimination**: Bystander reactions ("There goes another one...") now only fire on 3rd/final warning. Previously fired on all warnings, which was misleading when the walker wasn't actually being eliminated
- **Game over warnings stat**: "Warnings Received" now shows `player.warnings` (active count at death — always 3) instead of `totalWarningsReceived` (lifetime including walked-off warnings, which showed confusing numbers like 5)

### Improvements
- **Ticket queue stacking**: Converted single `activeTicket` to `ticketQueue[]` array. Multiple eliminations in quick succession now stack tickets vertically instead of overwriting. Each ticket gets 5s visible + 1.2s fade-out (6.2s total). Individual DOM elements created/removed by ID
- **Look Around cooldown**: 3-mile cooldown prevents morale spam. Button shows remaining miles when on cooldown, matching Stretch/Prize pattern

## 0.8.4 — 2026-02-27

Playtest-driven fixes — 10 bugs/features from production testing. Warning visibility, terrain feedback, ticket popup, pain management, clarity mechanics, game over stats.

### Critical Fix
- **NPC warnings visible for all tiers**: `issueNPCWarning` was silently eliminating Tier 3 walkers without narrating warnings. Now all tiers get narrated warnings. Backstop elimination routes through `pendingEliminations` delay queue

### New Features
- **Ticket popup on elimination**: Tear-off stub aesthetic with dashed perforation border, "TICKET PUNCHED" red stamp, walker name/number/state/motivation, mile and placement ordinal. Auto-dismiss 5s (Tier 3) or 8s (Tier 1/2) with fade-out animation
- **Stretch action**: Pain management — 8-12 pain relief, -2 stamina cost, 3-mile cooldown. New stretch icon in actions panel

### Improvements
- **Terrain change notifications**: Narrative messages when terrain changes (uphill, downhill, rough, flat) with contextual descriptions
- **GRADE meter clarity**: Mile markers prefixed "mi" to avoid confusion with elevation numbers. Ambient terrain descriptions updated to avoid contradicting terrain change notifications
- **"Walk Together" label**: Walk button now says "Walk Together" for clarity
- **Observe boosts morale**: +2 morale during day, +1 at night
- **Clarity stat active**: Drain starts at hour 6 (was 16), faster rates, pain accelerates drain, low clarity causes random effort drift

### Game Over Screen
- **Cause of death**: Contextual death reason displayed (exhaustion, dehydration, starvation, pain, despair, confusion — based on which stat was failing)
- **Accurate stats**: `totalWarningsReceived` lifetime counter (was showing current warnings at death). LLM conversations now tracked in `conversationHistory`. New "Walkers Talked To" stat (unique count)

## 0.8.3 — 2026-02-27

Playtest fixes — 5 bugs from production testing.

### Bug Fixes
- **Music on title page**: `ensureResumed()` now awaited before `startAmbientDrone()` — AudioContext was suspended when oscillators were created, causing silent playback on some browsers
- **Barkovitch dance scene too early**: Added `eliminationCount >= 40` prerequisite — scene no longer fires at mile 245 with only ~14 dead
- **Story button unresponsive**: Removed stale `relationship < 10` guard from `handleChatTellStory()` — button was ungated in v0.8.2 but handler still silently blocked low-relationship walkers
- **Social buttons missing on NPC approach**: `cachedSocialActionsHtml` now cleared on overlay teardown and creation — stale HTML cache caused `updateChatSocialActions()` to skip rendering when new overlay matched previous chat's button state
- **Pleading voice female/robotic**: Added male voice filter (matching `playWarningVoice()` pattern), lowered pitch from 1.3 to 0.9

## 0.8.2 — 2026-02-27

Playtest fixes — elimination timing, effort bar redesign, speech bubble improvements, and 3 UX fixes.

### Elimination Timing Chain
- **2s delay after final warning**: `pendingEliminations` Map queues eliminations instead of instant death. `processPendingEliminations()` runs each frame in game loop
- **Random pleading**: 30% chance of Web Speech API plea after "Final warning" (cut short by gunshot)
- **Gunshot at elimination**: `cancelSpeech()` + `playGunshot()` fires at moment of actual elimination
- **Scene delay**: Tier 1 elimination scenes wait 2s after death via `sceneBlockedUntil` on GameState

### Effort Bar Redesign
- **Replaced range slider**: `<input type="range">` → `<div class="effort-meter">` bar matching speed meter (12px height, 2px radius)
- **Arrow buttons inside bar**: Left/right arrows at bar edges for ±5 effort adjustment
- **Click-to-set**: Click anywhere on meter to set effort by position percentage

### Speech Bubble Improvements
- **Doubled duration**: Default 6s→12s, overheard 4s→8s (minimum), per-character scaling 55→110ms/char
- **Dissolve fade-out**: 1.5s animation with progressive blur (0→1px→3px) replacing abrupt 0.5s fade

### UX Fixes
- **Music on title page**: Ambient drone starts on first user gesture (title screen) instead of waiting for game start
- **Story action ungrayed**: Removed relationship≥10 gate from Story action — works with hostile walkers
- **Approach overlay dismiss**: `clearApproachBanner()` helper directly clears DOM on Reply/Nod/Ignore click (was blocked by stale render guard)

### Engine
- **`resetPendingEliminations`**: Added to `resetEngineGlobals()` for headless test isolation

## 0.8.1 — 2026-02-27

Chat header redesign, stat icons, error handling, and speech bubble fix.

### Chat Header Redesign
- **Column layout**: Speaker name + STOP button on top row, relationship gauge, then stat bars — decluttered from cramped single-row
- **STOP THE WORLD button**: Bigger, amber-colored, clearly labeled "⏸ STOP THE WORLD" (was tiny "■ STOP")
- **Visible stat bars**: Height doubled (4px → 8px), numeric values displayed, good/caution/danger color coding (green/amber/red)
- **STM → STA**: Renamed stamina label in chat header for consistency with HUD

### HUD Stat Icons + Tooltips
- **8 stat icons**: Colored SVG icons for STA (green clock), HYD (blue droplet), HUN (amber lunchbox), PAI (red zigzag), MOR (blue heart), CLR (purple sun), BDR (yellow organ), BWL (brown intestine)
- **Hover tooltips**: Each stat row shows full name and management hint on hover (e.g., "Stamina: Physical endurance. Lower effort to recover.")

### Server Error Classification
- **`classifyAgentError()`**: Replaces generic "Agent failed" with specific user-safe messages: quota exceeded, rate limited, timed out, model unavailable, auth error, content filtered, conversation too long
- Removed static `errorMessage` parameter from `createSSEResponse` — all 3 endpoints now use dynamic classification

### Action Icons
- **Pee icon**: Yellow droplet SVG
- **Poop icon**: Brown swirl SVG

### Bug Fixes
- **Speech bubble flicker**: Switched from innerHTML rebuild every 200ms (re-triggering CSS animation) to stable DOM — create/remove individual elements by bubble ID, toggle fade class via classList

## 0.8.0 — 2026-02-27

Playtest-driven overhaul — book-accurate warnings, speech bubble system, icon system, and 4 UX fixes.

### Warning System
- **Book-accurate format**: "Warning. Warning [number]." / "Second warning, [number]." / "Third warning, [number]. Final warning." — periods not exclamations, numbers only, never names
- Updated player warnings, NPC warnings, and 4 scripted scene warnings (Barkovitch incident, Olson breakdown, Barkovitch dance, McVries choice)

### Speech Bubble System (New)
- **Floating cartoon speech bubbles** for overheard conversations — replaces narrative log wall-of-text
- **Warning reaction bubbles**: When a nearby walker gets warned, a random Tier 1/2 NPC reacts with a character-appropriate comment (sympathetic / neutral / unsympathetic based on relationship)
- **Staggered multi-line conversations**: Lines appear 2.5s apart with left/right alternating positioning
- Both scripted overheards (narrative.ts) and LLM ambient overheards (overhear.ts) now route through speech bubbles
- CSS: backdrop blur, bubble tails, fade in/out animations, responsive (340px desktop, 260px mobile)

### Icon System (New)
- **11 inline SVG icons** (14px): food, water, story, encourage, walk, alliance, bond, break, talk, think, observe
- **Bright accent colors**: amber (food), blue (water/talk), purple (story/think), green (encourage/walk/alliance), gold (bond), red (break)
- Applied to chat social actions, main actions panel, and dossier Talk button

### UX Fixes
- **Chat close button**: Moved from inline flex row to standard top-right corner position (`&times;` with red hover)
- **Approach overlay buttons**: Fixed unclickable buttons during LLM streaming — stable DOM pattern (create once, update text only) prevents button destruction mid-click
- **Scene overlay blink**: Fixed panel transition flicker — cache now uses regenerated template string instead of browser-serialized innerHTML
- **Think About Prize cooldown**: 5-mile cooldown added (was spammable). Button shows remaining miles when on cooldown

### Infrastructure
- **Road visualization roadmap**: Documented complete overhaul plan in `docs/ROADMAP_visualization.md`

## 0.7.1 — 2026-02-27

Full 8-category code audit remediation — 9 criticals, 27 warnings, ~40 info items fixed across 16 files.

### Critical Fixes
- **Pee/poop instant-kill**: Bathroom actions could fire when player had 2+ warnings, causing immediate elimination. Added warning count guards (pee: <2, poop: <1)
- **Crisis keyboard DOM stale**: Pressing 1-4 to resolve crisis didn't clear DOM — overlay stayed visible. Added `container.innerHTML = ''` after resolution
- **SSE parser chunk boundary bug**: `currentEvent`/`currentData` were scoped inside the read loop in all 3 SSE parsers — multi-chunk events lost state. Moved declarations outside loop

### Security Hardening
- **Rate limiting**: 10 req/min chat, 5 req/min overhear/approach (IP-based sliding window)
- **Security headers**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy on all responses
- **Body size limit**: 50KB max request body
- **Message validation**: 2000-char cap on chat messages, player name length validation
- **Error sanitization**: Generic error messages to client, details server-side only
- **CORS fix**: Unknown origins return null (not wildcard)
- **escapeHtml() expansion**: Applied to crisis overlay (title, description, options), dialogue overlay, LLM chat header

### Performance Optimization
- **walkerStateMap O(1)**: New `getWalkerState()` with lazy `Map<number, WalkerState>` — replaced 28 `state.walkers.find()` calls across 7 files
- **getWalkersRemaining O(1)**: `walkers.length - eliminationCount` instead of `.filter().length`
- **computeAllyNearby once per tick**: Shared boolean passed to stamina + morale (was computed separately in each)
- **updateEnemyStatus Tier 1/2 only**: Skips 75 Tier 3 walkers via lazy-built tier12Numbers
- **getNearbyWalkers caching**: Returns cached result when position + elimination count unchanged
- **Binary search for route segments**: O(log n) instead of linear `.find()` (~360 calls/frame from terrain strip)
- **Canvas scanline pre-render**: Offscreen canvas rebuilt only on resize
- **Canvas ResizeObserver**: Cached dimensions replace per-frame `getBoundingClientRect()`
- **Noise texture reuse**: Canvas object reused when dimensions match
- **Narrative log threshold**: Raised to 500/400 (from 200/150), reduces rebuild frequency
- **Visualization dedup**: Removed duplicate walkerDataMap — uses canonical `getWalkerData()` from state.ts

### Game Logic Fixes
- **Crisis warningRisk routed through issueWarning()**: Proper sync of lastWarningTime/slowAccum/lastWarningMile
- **breakAlliance relationship**: Set to -41 (not -40) so `getRelationshipTier()` returns 'enemy' consistently
- **Unified breakAlliance effects**: Crisis `applyEffects` now matches engine behavior (relationship, isEnemy, walkingTogether, enemies array)
- **Empty crisis narrative guard**: Prevented empty strings from being added to narrative log
- **Walk-off timer crisis interaction**: Timer no longer resets during crisis speed overrides
- **Hostile action cascade**: warningTimer reset after trip/steal prevents NPC double-warning

### Frontend / UX
- **LLM chat auto-scroll**: Only scrolls when user is near bottom (< 50px threshold)
- **LLM chat header**: flex-wrap + gap for responsive layout
- **prefers-reduced-motion**: Disables all CSS animations for motion-sensitive users
- **Responsive breakpoints**: 900px (2-col), 700px (1-col) for bottom panel grid
- **ARIA attributes**: role="dialog" aria-modal on overlays, role="log" aria-live="polite" on narrative panel
- **Chat input**: maxlength="500" attribute

### Server
- **SSE helper**: Extracted `createSSEResponse()` shared across chat/overhear/approach
- **Dead code removal**: Removed unused `agentCache` Map and `clearHistory` export from agents.ts

### Audio
- **Buzzer node cleanup**: Added `onended` disconnect callback to warning buzzer (matching gunshot/pulse pattern)
- **startAudio listener cleanup**: Event listeners removed after audio initialization

## 0.7.0 — 2026-02-27

Chat interface, relationships & player interaction overhaul — relationships become the core gameplay loop.

### Relationship System
- **8-tier relationship spectrum**: Enemy, Hostile, Wary, Neutral, Friendly, Close, Allied, Bonded — with color-coded labels, threshold-based transitions, and `getRelationshipTier()` derived function
- **Chat card relationship gauge**: 80px gradient bar with position marker, tier label in tier color, trend arrow (↑/↓), alliance/bonded badge
- **Chat card stat bars**: Compact read-only bars for player morale/stamina and NPC morale/stamina
- **Relationship → stat bonuses**: +2 morale per relationship point gained (both), +1 stamina burst on ≥5 delta; -1 morale per point lost (player only)

### Social Actions (from chat, any walker)
- **Share Food**: +8 stamina, +5 morale, +10 relationship (30-min cooldown)
- **Share Water**: +5 stamina, +3 morale, +8 relationship (15-min cooldown)
- **Tell a Story**: +5 morale NPC, +3 morale player (10-mile cooldown, requires neutral+)
- **Encourage**: +3 morale NPC, +1 morale player (5-mile cooldown, any relationship)
- **Walk Together**: +2 morale/mile both, -3 stamina/mile both (toggle, requires friendly+)

### Alliance Expansion
- **Propose Alliance** from chat: Available at relationship ≥ 40. Outcome by threshold (refused/50-50/accepted)
- **Propose Bond** from chat: Available when allied, relationship ≥ 85, conversations ≥ 8. Max 1 bonded ally
- **Break Alliance** from chat: Relationship → -40, instant enemy status

### Enemy System
- **Auto-detection**: Become enemy at relationship < -40, stop at ≥ -20 (hysteresis band)
- **5 enemy-initiated crisis events**: Pace disruption, psychological warfare, sleep attack, crowd manipulation, supply interference — all use existing crisis system with 5-mile cooldown
- **7 player hostile actions** from chat: Taunt, lullaby, isolation, pace pressure, crowd turn, trip, steal supplies — 3rd-warning safety enforced on all
- **Enemy confrontation approach**: Priority 4, NPC approaches player to needle/taunt (10-mile key)
- **Bonded grief crisis**: Triggered on bonded ally death — -40 morale + options (rage/numb/honor)
- **Enemy visualization**: Red pulsing ring on canvas (sine wave opacity)
- **Bonded visualization**: Gold inner ring inside blue alliance ring

### Chat UX
- **"Stop the World" button**: Pause game from chat overlay header. Auto-resumes on chat close
- **Social action buttons** in chat card with cooldown timers

### Audit Infrastructure
- `/audit` command: Runs all 8 code review commands in parallel, presents consolidated report

### Bug Fixes (from audit)
- **`_activeEffects` race condition**: Module-level mutable state shared across concurrent SSE requests. Tools now closure-bound per-request — no shared state
- **Act transitions skip/regress**: Acts could jump from 2→4 or regress from 3→2 under fast eliminations. Now monotonically increasing
- **Poop narrative after death**: `issueWarning()` could trigger elimination before narrative was added. Narrative now added first
- **Enemy/bonded prompt gated by arcPhase**: Tier 2 walkers without arcs never got hostile prompts. Moved relationship context outside arc guard
- **Scene panel XSS**: Scene panel text rendered via innerHTML without `escapeHtml()`. Added escaping to both render paths
- **Absence effects O(n²)**: `checkAbsenceEffects` used `.find()` instead of `getWalkerData()` O(1) map lookup

### Validation
- 2 new checks: enemy/bond field initialization, relationship tier boundary correctness (22 total)

## 0.6.1 — 2026-02-27

Railway deployment + 4 playtest bug fixes (gunshot timing, crisis buttons, canvas readability, terrain grade).

### Deployment
- **Railway production deployment**: Single-service architecture — Hono serves API routes + Vite static build on same domain
- **Static file serving**: `@hono/node-server/serve-static` with SPA fallback for client-side routing
- **Dynamic port**: `process.env.PORT` for Railway, falls back to 3001 for local dev
- **CORS auto-config**: Railway domain auto-added via `RAILWAY_PUBLIC_DOMAIN` env var
- **Production client URLs**: `agentClient.ts` uses relative URLs (same-origin) in production, localhost:3001 in dev

### Bug Fixes
- **Gunshot before 3rd warning**: Warning + elimination narrative entries were added in same game tick, causing both sounds to fire synchronously. Gunshots now delayed 3s via `setTimeout` so warning voice plays first. Multiple gunshots staggered by 500ms.
- **Crisis overlay buttons unresponsive**: `handleCrisisOption` cleared `cachedCrisisHtml` but never cleared `container.innerHTML` — overlay stayed visible, second click returned early. Fixed by clearing DOM immediately (same pattern as `handleSceneClose`).
- **Canvas text unreadable on HiDPI**: No `devicePixelRatio` scaling — 5-7px fonts were microscopic on Retina displays. Added DPI-aware canvas buffer sizing with `ctx.setTransform(dpr,...)`. All font sizes increased to 9-12px range.
- **Terrain strip unintuitive**: Left-edge elevation strip only showed colors with no grade labels. Now shows `+6% ▲` (uphill), `-3% ▼` (downhill), `ROUGH`, or `FLAT` with color-coded text. Strip widened from 12px to 18px, label changed from "ELEV" to "GRADE".

## 0.6.0 — 2026-02-26

Playtest-driven overhaul — 3 critical bug fixes, effort bar core mechanic, bathroom system, warning voice, The Major, and visualization reimagining.

### Bug Fixes
- **Crisis overlays auto-dismiss**: All crisis/emergency overlays expired before player could interact at high game speeds. Root cause: timer used `gameMinutes` inflated by `gameSpeed`. Converted all crisis timers to real-world seconds (15-30s range). `updateActiveCrisis()` now takes `realDeltaMs` instead of `gameMinutes`.
- **Warning format wrong**: Changed from `"Warning. Walker #47. First warning."` to book-accurate format: `"Warning! Warning 47!"` / `"Warning! Second warning, 47!"` / `"Warning! Warning 47! Third warning, 47!"`. Updated 6 locations across engine.ts, crises.ts, and narrative.ts.
- **"Walker #—" missing number**: Barkovitch incident scene, Olson scene, Barkovitch dance scene, and McVries choice scene all had old-format warning text — updated to book format with actual walker numbers.

### New Features
- **Effort bar**: Replaced speed slider with effort mechanic (0-100%). Speed is now a computed output: `speed = (effort/100) * maxSpeed * terrainMult`. Sweet spot at 58-68% effort minimizes stamina drain (0.5x modifier). Arrow keys adjust effort ±5. Effort-based stamina drain modifiers: >80% = 1.5x, >68% = 1.1x, <40% = 0.6x.
- **Pee/poop system**: Added bowel tracking (fills at 60% bladder rate). Player-initiated bathroom actions: Pee costs 1 warning (resets bladder), Poop costs 2 warnings (resets bowel). Requires minimum 20 bladder/bowel. BLD stat renamed to BDR, BWL stat bar added.
- **Warning voice audio**: Web Speech API speaks warning announcements (rate 0.9, pitch 0.7, male English voice). Buzzer plays first as attention-getter, voice speaks after 400ms delay. Falls back to buzzer-only if speech unavailable.
- **The Major character presence**: 8 scripted appearances at miles 12 (jeep survey), 50 (helicopter flyover), 100 (scene: address), 150 (scene: Portland appearance), 200 (relayed message), 300 (jeep following closer), 350 (jeep gone), 395 (reappears near Stebbins if alive).

### Visualization Overhaul
- **Walker condition colors**: Dot color from health score (stamina + inverse pain + morale): bright white/green → amber → red → dim gray
- **Terrain elevation strip**: Left-edge profile showing ±10 miles of terrain, color-coded (orange=uphill, blue=downhill, yellow=rough, green=flat)
- **Weather effects**: Rain streaks, fog opacity layer, cold blue shift
- **Night headlight cone**: Halftrack headlights illuminate a cone of road ahead
- **Enhanced halftrack**: Rectangular body, engine heat glow, exhaust plume
- **Walker number labels**: Tier 1 dots show `Name #N`
- **Alliance connection lines**: Faint green dashed lines between player and allies
- **Mile markers**: Tick marks with distance numbers along right road edge
- **Road detail**: Center line dashes and shoulder lines

### Validation Suite Updates
- Headless simulation updated for effort system: uses effort=85 (not targetSpeed), stat floors (stamina≥50, pain≤50), adaptive effort control, crisis temp-effect removal, and warning cap to survive 400 miles

## 0.5.0 — 2026-02-26

Validation suite, second-pass review sweep (15 fixes), scene overlay bugfix, and terrain variety.

### Validation Suite
- **Automated test harness**: `npm run validate` runs 20 checks (10 data integrity + 10 headless simulation) in ~0.2s
- **Headless simulation**: Runs `gameTick()` for 400 miles without DOM/LLM — verifies elimination order, warning system, act progression, scene triggers, ending reachability
- **Data integrity checks**: Walker roster, arc completeness, route/crowd coverage, NPC relationships, required fields

### Bug Fixes
- **Scene overlay "Continue Walking" broken**: `handleSceneClose` prematurely cleared `cachedSceneHtml` so render never cleared the DOM — now clears container immediately
- **Scene slide transition flickering**: Panel changes rebuilt entire overlay via innerHTML, re-triggering fadeIn animation — now uses direct DOM updates
- **Crisis warnings bypass pipeline**: `warningRisk` from crises didn't update `lastWarningTime`/`slowAccum`/`lastWarningMile` — could cause rapid double-warnings
- **`set_flag` stored on wrong object**: Agent flag effects stored on `player.flags` instead of walker's `conversationFlags`
- **Arc stage overheard lost on LLM failure**: `triggeredEvents.add()` fired before LLM call — network failure permanently lost story beat. Now deferred to success handler
- **Arc phase gap**: Walker lost all arc context when mile range advanced past conversation threshold — now falls back to latest entered stage
- **Duplicate Escape handler cascade**: Both `ui.ts` and `main.ts` handled Escape — consolidated to `main.ts` only, using exported `closeLLMDialogue`/`handleSceneClose`
- **`elimination_reaction` wrong relationship**: Used dead walker's relationship with player instead of approaching walker's
- **Missing walker #99**: `FIRST_NAMES` array had 74 entries instead of 75 (added 'Connors')

### Performance
- **`getWalkerData()` O(1)**: Converted from `.find()` (O(n), 300+ calls/tick) to lazy-built `Map<number, WalkerData>`
- **Crisis overlay targeted updates**: Timer text/bar updated via DOM ops instead of full innerHTML rebuild every 200ms

### Security
- **Self-XSS via player name/prize**: Applied `escapeHtml()` to intro text and gameover screen innerHTML sites

### New Features
- **Proximity approach type**: 8th approach type implemented (priority 1, casual remarks from nearby walkers, 30-mile cooldown)
- **Downhill terrain**: Miles 80-90 (descent into town) — reduced stamina drain, knee pain
- **Rough terrain**: Miles 250-270 (deteriorating road) — 1.2x stamina drain modifier
- **Absence effects repeatable**: Changed from 1 per walker total to 1 per 5-mile bucket (multiple ghost references possible in 2-30 mile window)

### Infrastructure
- **Scene/LLM-chat guard**: Scenes won't activate during open LLM dialogue (prevents overlay overlap)
- **Module reset exports**: `resetEngineGlobals()`, `resetCrisisGlobals()`, `resetWalkerDataMap()` for headless testing

## 0.4.1 — 2026-02-26

Comprehensive code review sweep — security hardening, server reliability, performance optimization, and arc completeness.

### Security
- **XSS prevention**: Added `escapeHtml()` utility; applied to all innerHTML sites with LLM/user text (narrative, status, dossier, approach)
- **CORS whitelist**: Replaced permissive `origin || '*'` with explicit allowed origins
- **Input validation**: Walker ID range-checked (1-100) on chat endpoint
- **Anti-jailbreak**: System prompt instructs agents to stay in character when player attempts to break immersion

### Server Reliability
- **Request-scoped effects**: `createEffectsScope()` replaces global mutable `pendingEffects` array — prevents race conditions
- **History error rollback**: `removeLastHistory()` on agent failure prevents orphaned user messages
- **History alternation**: Trimming preserves required user/assistant message alternation
- **Overhear context**: `buildGameContextBlock()` skips walker state for overhear endpoint (irrelevant for two-NPC conversation)

### Client Robustness
- **Agent client timeout**: 30s `AbortSignal.timeout` on SSE fetch
- **Configurable server URL**: `VITE_AGENT_SERVER_URL` env var (default localhost:3001)
- **Player warning system**: Added `slowAccum`/`lastWarningTime` fields; proper 60-minute walk-off timer
- **Pact ending fix**: `alive <= 3` check now reachable (moved before `alive <= 1` block)
- **Crisis guards**: No crisis triggers during active approach or scene overlay
- **Escape key priority**: Proper overlay dismiss ordering (LLM dialogue > approach > dialogue > walker picker)
- **Overhear mile gap**: `lastOverheardMile` now set only on success, not before LLM call

### Performance
- **Canvas optimization**: `walkerDataMap` for O(1) walker lookup; inline alive checks eliminate per-frame array allocation
- **Audio node cleanup**: Oscillators and gains disconnect via `onended` callbacks and setTimeout
- **Warning pips cache**: HTML comparison guard prevents unnecessary innerHTML assignment
- **Stamina rebalance**: Tuned drain/recovery rates; morale death → speed penalty instead of direct elimination

### Arc Completeness
- **All 9 Tier 1 walkers now have complete 5-phase arcs**: Added missing crisis phases (Stebbins, Baker, Parker, Scramm, Harkness) and farewell phases (Olson, Barkovitch)

### Infrastructure
- **Vite type definitions**: Added `src/vite-env.d.ts` for `import.meta.env` support
- **Review command suite**: Generated 8 tailored code review commands in `.claude/commands/`

## 0.4.0 — 2026-02-26

Character development overhaul — NPCs come alive through approaches, arcs, cinematic scenes, and meaningful relationships.

### Scene System
- **Cinematic scene overlays**: 8 major story moments (first elimination, Barkovitch incident, Olson breakdown, Scramm pact, Barkovitch dance, Parker charge, McVries choice, Stebbins collapse) presented as multi-panel overlays that pause the game
- **Tier 1 elimination scenes**: When a Tier 1 walker with relationship > 20 is eliminated, their death is presented as a cinematic scene overlay
- **Decline narratives**: Tier 1 walkers show visible deterioration 5-15 miles before their elimination
- **Absence effects**: Ghost references appear for 2-30 miles after Tier 1 deaths ("You look left to say something to Baker. Then you remember.")

### NPC Approach System
- **NPCs initiate conversation**: Walkers proactively approach the player with LLM-generated opening lines
- **8 approach types** with priority: arc milestone, elimination reaction, warning check, vulnerability, offer alliance, crisis aftermath, introduction, proximity
- **Approach banner UI**: Reply (opens full chat), Nod (+3 relationship), Ignore (-2 relationship), 30s auto-dismiss
- **Server endpoint**: New `/api/approach` SSE streaming endpoint

### Character Arc System
- **Walker arc stages**: Each Tier 1 walker has 5 phases (introduction → opening_up → vulnerability → crisis → farewell) with mile ranges and prompt hints
- **Arc context injection**: LLM agents receive arc phase, conversation count, revealed facts, and player actions in their context
- **Conversation tracking**: conversationCount, revealedFacts (from info tool calls), playerActions (sharing food/water, crisis help)

### NPC Relationship Arcs
- **8 NPC relationship arcs** (~25 stages): Garraty-McVries, McVries-Barkovitch, Baker-Scramm, Garraty-Stebbins, Parker-Garraty, Olson-McVries, Harkness-Baker, Scramm-Garraty
- **Arc-aware overheard selection**: Relationship arc stages fire before random pair selection, with "Previously..." context injection

### Walker Dossier
- **Click walker → dossier**: Shows name, archetype, relationship, conversation count, alliance status, warnings, revealed facts
- **Talk button**: Opens full LLM chat from dossier panel

### Crisis System
- **Crisis events**: Moral dilemmas with timed decisions and gameplay consequences
- **Player action tracking**: Crisis resolutions tracked in walker's playerActions for LLM context

## 0.3.0 — 2026-02-26

Stable DOM, generative music, game feel improvements.

- **Stable DOM panels**: Status panel and LLM chat overlay refactored to create-once + targeted DOM updates — eliminates button flicker and unclickable controls
- **Generative ambient music**: Chord progression in Am with crossfading pads, filtered noise (wind), rhythmic pulse at 72 BPM walking cadence
- **EQ-style speed meter**: Dynamic bar with peak-hold indicator, 4.0 mph danger line, target speed triangle
- **Physical position changes**: Speed boost + stamina cost + smooth ease-in-out animation on canvas (no teleporting)
- **Warning pacing fix**: NPC backstop now spaces warnings 5 game-minutes apart with gradual speed degradation, preventing walkers from being killed without proper warnings
- **Chat overlay improvements**: Append-only messages, streaming element promotion (no flicker), click-background-to-close, Escape key closes overlay

### Bug fixes
- Fixed status panel innerHTML rebuild every 200ms making position buttons unclickable
- Fixed chat overlay innerHTML rebuild causing X button to not work
- Fixed 1-frame flicker on walker response complete (streaming element promoted in-place)
- Fixed NPC warning backstop issuing warnings every game tick instead of spaced intervals
- Fixed music inaudible on laptop speakers (was sub-bass drone at 55 Hz)

## 0.2.0 — 2026-02-26

LLM agent integration, visualization, and UX improvements.

- **LLM Agents**: GPT-5.2 powered walker conversations via OpenAI Agents SDK + Hono SSE server
- **Bird's eye visualization**: Canvas view with walker dots, road, halftrack, soldiers, crowd
- **Walker picker**: Talk button opens a selection list of nearby walkers (all tiers)
- **Position feedback**: Changing pack position shows narrative entry
- **Agent tools**: Walkers can adjust relationship, morale, set flags, share info
- **Session skills**: `/begin-session` and `/end-session` skill files
- **GitHub repo**: https://github.com/bretstarr2024/The-Long-Walk

### Bug fixes
- Fixed agent `developer` role → embed game context in user message
- Fixed stream event type (`output_text_delta` not `response.output_text.delta`)
- Removed unsupported `temperature` param for gpt-5.2-chat-latest

## 0.1.0 — 2026-02-26

Initial release.

- 99 walkers (9 Tier 1, 15 Tier 2, 75 Tier 3) with personality data
- Game loop with requestAnimationFrame + 200ms render throttle
- Player controls: speed, position, talk, eat, drink, rest
- Event delegation UI with HTML caching (no flicker)
- Append-only narrative log with scripted events and hallucinations
- 5 ending conditions
- Keyboard shortcuts: space (pause), 1-4 (speed), arrows (speed adjust)
