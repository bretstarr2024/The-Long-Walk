# Changelog

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
