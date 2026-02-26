# Changelog

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
