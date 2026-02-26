Review the LLM agent integration — prompt engineering, context management, and streaming reliability.

## Context
Read these files first:
- `server/prompts.ts` — System prompt builder + game context formatter (126 lines — read in full)
- `server/agents.ts` — Agent factory, history cache (65 lines — read in full)
- `server/tools.ts` — Agent tools: adjust_relationship, adjust_morale, set_flag, share_info (72 lines — read in full)
- `server/index.ts` — Endpoint handlers that orchestrate agent calls (357 lines — read in full)
- `src/agentClient.ts` — Client-side SSE streaming + context building (263 lines — read in full)
- `src/ui.ts` — Where game context is assembled for LLM calls (search for `buildGameContext` and `requestChat`/`requestApproach`/`requestOverhear`)
- `.claude/CLAUDE.md` — Model: `gpt-5.2-chat-latest`, no fallback to scripted dialogue

## What to Check

1. **System prompt quality**: Read `buildSystemPrompt()` in `server/prompts.ts`:
   - Does it establish clear character identity (name, age, personality, backstory)?
   - Does it set behavioral guardrails (response length, stay in character, reference game state)?
   - Does it instruct the model on tool usage?
   - Is the prompt concise enough to leave room for conversation history?
   - Does it prevent jailbreaking / out-of-character behavior?

2. **Game context injection**: Read `buildGameContextBlock()` in `server/prompts.ts`:
   - Are all relevant game state fields included (mile, act, time, weather, nearby walkers, eliminations)?
   - Is arc context injected (arc phase, prompt hint, conversation count, revealed facts, player actions)?
   - Is the context block formatted clearly for the model to parse?
   - Is there redundant information that wastes tokens?

3. **Context window management**: The model has a finite context window. Check:
   - System prompt size (estimate token count)
   - Game context block size
   - Conversation history size (capped at 20 messages in `server/agents.ts`)
   - Total estimated tokens per request
   - Is 20 messages too many? Could long conversations exceed the context window?

4. **Conversation history integrity**: In `server/agents.ts`:
   - History alternates user/assistant roles correctly
   - `addToHistory()` trims from the oldest messages
   - History is per-walker (keyed by walker number)
   - Game context is prepended to user messages (not stored as separate history entries)
   - What happens if the same walker is chatted with across multiple in-game "days"?

5. **Tool definitions**: Read `server/tools.ts`:
   - `adjust_relationship`: Does it have proper parameter descriptions? Range bounds?
   - `adjust_morale`: Same — clear parameters and bounds?
   - `set_flag`: What flags can be set? Is there validation?
   - `share_info`: Does the model know when to use this?
   - Are tool calls properly converted to `effect` SSE events?

6. **Tool result handling**: When an agent calls a tool, verify:
   - The tool execution result is sent back to the agent
   - The tool call + result are added to conversation history
   - The corresponding `effect` event is emitted to the client
   - The client applies the effect to game state (relationship change, morale change, etc.)

7. **Three endpoint patterns**: Compare `/api/chat`, `/api/overhear`, and `/api/approach`:
   - Chat: Full conversation with history — should be the richest context
   - Overhear: Two NPCs talking — should include BOTH walker personalities and relationship context
   - Approach: NPC initiates — should be a 1-2 sentence opener, not a full conversation
   - Do all three use the same agent factory? Should they?

8. **Streaming robustness**: In `server/index.ts`:
   - What happens if the OpenAI API returns an error mid-stream?
   - Is there a timeout on the agent call?
   - Does the SSE stream properly close on error?
   - Does the client handle partial responses gracefully?

9. **Arc context effectiveness**: The arc system injects prompt hints (e.g., "Share a vulnerability about your family") into the LLM context. Check:
   - Are prompt hints specific enough to guide behavior without being heavy-handed?
   - Does the model receive enough history context to avoid repeating itself?
   - Are `revealedFacts` properly injected so the model doesn't re-share information?

10. **Cost and rate considerations**:
    - How many LLM calls per mile? (chat + overheard + approach)
    - Is there any request deduplication or debouncing?
    - Could rapid player interactions (spam-clicking Talk) cause excessive API calls?
    - Are there any caching opportunities (e.g., caching overheard results)?

## Anti-Patterns to Flag
- System prompt that's too long (>500 tokens) — crowds out conversation
- Game context that includes irrelevant state (e.g., all 99 walker statuses)
- History that doesn't alternate user/assistant (causes model confusion)
- Tool definitions without clear parameter descriptions
- Missing error handling on agent stream
- Approach endpoint that generates full conversations instead of short openers
- No debouncing on user chat requests
- `developer` or `system` role used in input items (unsupported by OpenAI Agents SDK)
- `temperature` parameter in modelSettings (rejected by gpt-5.2)

## Output Format
Report findings as:
- **CRITICAL**: [issue] — [file:line] — [why it matters]
- **WARNING**: [issue] — [file:line] — [recommendation]
- **INFO**: [observation] — [file:line]

End with: Summary paragraph + Top 3 recommended actions.
