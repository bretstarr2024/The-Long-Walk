# Session Handoff: Railway Deployment + Playtest Bug Fixes (v0.6.1)

**Date:** 2026-02-27
**Session ID:** 2026-02-27-deploy-and-fixes
**Version:** 0.6.1
**Branch:** main

---

## Where We Are

The Long Walk is a survival simulation game at v0.6.1, now live in production on Railway at https://the-long-walk-production.up.railway.app. The client is a Vite + TypeScript vanilla DOM app; the server is Hono + OpenAI Agents (GPT-5.2). 99 walkers march a 400-mile death march, with 9 Tier 1 and 15 Tier 2 walkers powered by LLM agents for conversation.

This session had two work streams: (1) deploying the game to Railway as a single-service architecture where Hono serves both the API and the Vite static build, and (2) fixing 4 playtest bugs — gunshot timing, crisis overlay buttons, canvas text readability, and terrain grade indicators.

All changes compile cleanly (client + server TypeScript, Vite production build), and the deployed Railway instance serves the health endpoint, client HTML, and JS assets correctly. The 20-check validation suite was already passing from v0.6.0 and remains unaffected by these changes.

## What Changed This Session

### Deployment (Railway)
- **Single-service architecture**: Hono serves API routes (`/api/*`) and Vite static build (`dist/`) on the same domain — no CORS needed in production
- **Dynamic port**: `process.env.PORT` for Railway, falls back to 3001 for local dev
- **CORS auto-config**: `RAILWAY_PUBLIC_DOMAIN` env var auto-adds the production domain to the CORS whitelist
- **Production client URLs**: `agentClient.ts` uses relative URLs (empty string = same-origin) in production, localhost:3001 in dev, detected via `import.meta.env.DEV` with `??` operator
- **Start script**: `NODE_ENV=production tsx server/index.ts` — tsx moved from devDependencies to dependencies for Railway nixpacks compatibility
- **SPA fallback**: Non-API `GET *` routes return `index.html` for client-side routing
- Files changed: `server/index.ts`, `src/agentClient.ts`, `package.json`

### Client — Bug Fixes
- **Gunshot after 3rd warning**: Warning + elimination narrative entries were added in the same game tick, so the sound loop fired both sounds synchronously. Gunshots are now collected during the loop and fired after a 3-second `setTimeout` delay so the warning voice (buzzer + speech) plays first. Multiple gunshots stagger by 500ms.
- **Crisis overlay buttons work**: `handleCrisisOption` cleared `cachedCrisisHtml` but never cleared `container.innerHTML` — the overlay stayed visible and second clicks returned early because `activeCrisis` was already null. Fixed by clearing DOM immediately, same pattern as the already-fixed `handleSceneClose`.
- **Canvas text readable on HiDPI**: Added `devicePixelRatio` scaling — canvas buffer sized to `displayW * dpr` x `displayH * dpr`, context transformed with `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`. All font sizes bumped from 5-7px to 9-12px. Mouse coordinates in click handler divide by dpr to match CSS pixel space.
- **Terrain grade labels**: Left-edge strip widened from 12px to 18px, header changed from "ELEV" to "GRADE". Current terrain type shown as colored grade text next to the position marker: `+6% ▲` (orange, uphill), `-3% ▼` (blue, downhill), `ROUGH` (yellow), `FLAT` (green).
- Files changed: `src/main.ts`, `src/ui.ts`, `src/visualization.ts`

## Why These Changes Were Made

The user wanted to push the game live — Railway was chosen over Vercel because the Hono SSE server needs a persistent runtime (not serverless). During playtesting, the user reported 4 issues: gunshots firing before the warning voice finishes, crisis overlay buttons being completely unresponsive, canvas text being impossibly small to read, and the terrain strip being unintuitive with only colors and no grade numbers.

## What Must Happen Next

1. **Playtest the deployed Railway instance** end-to-end — verify health, chat with walkers, trigger scenes
2. **Verify canvas visuals** — DPI scaling, font sizes, terrain grade labels across browsers/displays
3. **Test crisis overlay buttons** — confirm clicks resolve crises and dismiss overlay
4. **Verify gunshot timing** — 3rd warning voice should complete before gunshot fires
5. **Assess effort bar balance** — can a reasonable player survive 200+ miles with effort management?
6. **Cross-browser warning voice** — test Web Speech API on Chrome, Safari, Firefox
7. **Monitor Railway uptime** — check if free tier has sleep/timeout limitations

## Decisions Made (Do Not Re-Debate)

| Decision | Rationale |
|----------|-----------|
| Single-service Railway deployment | Eliminates CORS complexity, simpler config, one domain |
| `??` (nullish coalescing) for SERVER_URL | Empty string `''` is a valid production value (same-origin); `||` would skip it |
| `ctx.setTransform` for DPI scaling | All existing coordinate math works unchanged in CSS pixel space |
| 3000ms fixed gunshot delay | Simple, reliable; warning voice is ~2-3s with buzzer + speech |
| Terrain grade numbers are cosmetic | Route data has terrain types but no numeric grades; displayed values (+6%, -3%) are representative |

## Explicitly Deferred

- **Pain recovery mechanic** — deferred since v0.5.0; needs playtesting to assess balance
- **Tier 2 arc stages** — architecture supports it, no data defined yet
- **Crowd density pulsing animation** — cut for scope in v0.6.0
- **Alliance line animation** — static dashed lines only
- **Railway custom domain** — using default `.up.railway.app` domain for now
- **Dynamic gunshot delay** — hardcoded at 3s; could measure speech duration for precision

## Known Risks

- **Railway free tier uptime** — may sleep after inactivity; production traffic will clarify
- **Gunshot delay overlap** — if warning voice exceeds 3s, gunshot may overlap; unlikely but possible
- **Canvas DPI on dpr=1** — tested on Retina (dpr=2); should work at dpr=1 but not visually verified
- **Effort death spiral** — uphill + low stamina → maxSpeed caps → can't maintain 4.0 mph at any effort level
- **OPENAI_API_KEY exposure** — Railway env vars are in the dashboard; project visibility matters

## Key Files Modified

| File | Changes |
|------|---------|
| `server/index.ts` | Dynamic port, CORS for Railway, static file serving + SPA fallback |
| `src/agentClient.ts` | Relative URLs in production via `??` + `import.meta.env.DEV` |
| `package.json` | Start script, tsx to dependencies, engines field |
| `src/main.ts` | Gunshot delayed 3s after warning voice, multiple staggered 500ms |
| `src/ui.ts` | Crisis container DOM cleared immediately in handleCrisisOption |
| `src/visualization.ts` | DPI scaling (`setTransform`), fonts 9-12px, terrain grade labels, strip widened |
| `docs/CHANGELOG.md` | v0.6.1 entry |
