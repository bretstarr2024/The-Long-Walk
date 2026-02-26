# The Long Walk

Survival simulation game based on Stephen King's novel. 99 walkers on a 400-mile death march.

## Stack
- **Client**: Vite 6 + TypeScript 5.7 + vanilla DOM (no framework)
- **Server**: Hono + @openai/agents (GPT-5.2) — each Tier 1/2 walker is an LLM agent
- **Model**: `gpt-5.2-chat-latest`

## Key Architecture Patterns
- Event delegation: single click handler on `#app`, all buttons use `data-action` attributes
- HTML caching: compare HTML strings before innerHTML assignment to prevent DOM flicker
- Append-only narrative log: track `renderedNarrativeCount`, never rebuild
- Render throttling: game screen renders at ~5 FPS (200ms intervals), non-game screens render immediately
- SSE streaming: server streams agent responses as `event: token`, `event: effect`, `event: done`

## Project Structure
```
src/           — Client source (Vite entry: main.ts)
server/        — Hono server + OpenAI agents
docs/sessions/ — Session ledger + handoff artifacts
.claude/skills/ — begin-session, end-session
```

## Walker Tiers
- Tier 1 (9 major NPCs): Full LLM agent conversations, named dots on visualization
- Tier 2 (15 supporting): LLM agent conversations, smaller dots
- Tier 3 (75 background): No dialogue, tiny gray dots in pack

## Commands
- `npm run dev` — Vite client dev server
- `npm run server` — Hono agent server (port 3001)
- `npm run dev:all` — Both concurrently

## Rules
- No fallback to scripted dialogue. LLM agents or nothing.
- `OPENAI_API_KEY` required for server.
