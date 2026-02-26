# Session Handoff: LLM Agent Fix + Walker Picker UX

**Date:** 2026-02-26
**Session ID:** 2026-02-26-llm-fix-and-ux
**Version:** 0.2.0
**Branch:** main

---

## Where We Are

The Long Walk is a browser-based survival simulation where 100 walkers march south on Route 1. The game runs on Vite + TypeScript (client) with a Hono agent server that connects to GPT-5.2 via the OpenAI Agents SDK. Each Tier 1/2 walker is an LLM-powered conversational agent with personality, backstory, and the ability to affect game state via tool calls.

This session fixed three critical bugs that prevented LLM conversations from working, and added a walker picker UI so players can choose who to talk to instead of getting a random walker. The agent server is confirmed working — walkers respond in character, stream tokens in real time, and use tools to adjust relationship/morale.

The bird's eye canvas visualization (from the prior session) shows walker dots, the road, halftrack, soldiers, and crowd. The game loop, elimination system, warnings, and 5 ending conditions are all functional.

## What Changed This Session

### Server
- Fixed `developer` role in agent input items — OpenAI Agents SDK only supports `user`/`assistant`, so game context is now embedded as a prefix in the user message
- Fixed stream event type from `response.output_text.delta` to `output_text_delta` (SDK naming convention)
- Removed `temperature: 0.9` from agent modelSettings — gpt-5.2-chat-latest rejects this parameter

### Client
- Talk button now opens a walker picker showing all nearby walkers with name, number, tier badge (T1/T2/T3), and relationship status
- Clicking a Tier 1/2 walker in the picker opens LLM chat; clicking Tier 3 shows a contextual one-liner
- Position buttons (front/middle/back) now produce narrative feedback: "You drift from the middle of the pack to the front of the pack"
- Escape key closes the walker picker
- Walker clicks in the nearby list route through the same picker logic

### Docs
- CHANGELOG updated with v0.2.0 entry
- MEMORY.md updated with Agents SDK gotchas and new design decisions

## Why These Changes Were Made

The LLM chat interface was completely non-functional — three separate bugs prevented any response from reaching the browser. The user also requested the ability to choose conversation partners instead of random selection, and reported that position buttons felt broken due to lack of feedback.

## What Must Happen Next

1. Investigate position button responsiveness — user reported "not working" but the code logic is correct. Open browser console and check if `[UI] Action: pos-front` logs appear on click.
2. Test full multi-turn conversations with different walkers to verify streaming, history, and tool effects.
3. Restart Claude Code and verify `/begin-session` and `/end-session` skills are discoverable.
4. Consider walker-initiated conversations (NPCs approach the player based on relationship/events).

## Decisions Made (Do Not Re-Debate)

- **No fallback dialogue**: LLM agents or nothing. No scripted fallback when server is offline.
- **Walker picker over random selection**: User explicitly requested choosing who to talk to.
- **Game context in user message**: The Agents SDK doesn't support `developer` role input items. Context is prefixed to each user message with `[GAME STATE]` and `[PLAYER SAYS]` markers.
- **No temperature parameter**: gpt-5.2-chat-latest rejects it. Rely on model defaults.

## Explicitly Deferred

- **Persistent conversation history**: Agent memory is in-memory only, lost on server restart. Acceptable for now.
- **Walker position drift**: NPC walkers stay at their assigned position (front/middle/back) permanently. No dynamic movement between positions.
- **Skill registration**: `/begin-session` and `/end-session` SKILL.md files exist but aren't being discovered by Claude Code. Needs investigation after CLI restart.

## Known Risks

- `OPENAI_API_KEY` must be set as environment variable for the agent server
- Model `gpt-5.2-chat-latest` could be renamed/removed by OpenAI
- Agent history is volatile — server restart clears all conversation context

## Key Files Modified

| File | Change |
|------|--------|
| `server/index.ts` | Fixed stream event type, embedded context in user message |
| `server/agents.ts` | Removed temperature from modelSettings |
| `src/ui.ts` | Walker picker, position feedback, refactored talk/click handlers |
| `src/main.ts` | Import closeWalkerPicker, Escape closes picker |
| `src/styles.css` | Walker picker styles, active button state |
| `docs/CHANGELOG.md` | v0.2.0 entry |
