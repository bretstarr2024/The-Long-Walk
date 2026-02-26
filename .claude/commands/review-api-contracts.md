Review the API contracts between the Vite client and Hono server.

## Context
Read these files first:
- `server/index.ts` — All HTTP/SSE endpoints (357 lines — read in full)
- `src/agentClient.ts` — Browser-side API client (263 lines — read in full)
- `server/prompts.ts` — GameContext and WalkerProfile interfaces used server-side
- `src/types.ts` — Client-side type definitions
- `server/agents.ts` — Agent factory and history management
- `server/tools.ts` — Agent tools that produce `effect` events

## What to Check

1. **Endpoint inventory**: Verify the client and server agree on all endpoints:
   - `GET /api/health` — server health check
   - `POST /api/chat/:walkerId` — LLM conversation with walker
   - `POST /api/overhear` — NPC ambient conversation
   - `POST /api/approach` — NPC proactive approach
   Check for any endpoints defined on one side but not the other.

2. **Request body shape agreement**: For each POST endpoint, compare:
   - What `src/agentClient.ts` sends in the request body
   - What `server/index.ts` destructures from `req.json()`
   - Field names, types, and required/optional status must match
   Pay special attention to `GameContext` / `GameContextForAgent` — the client builds this in `src/ui.ts` and the server consumes it in `server/prompts.ts`.

3. **SSE event protocol**: Both sides must agree on event names and payload shapes:
   - `event: token` → `data: { text: string }`
   - `event: effect` → `data: { type: 'relationship'|'morale'|'flag'|'info', walkerId?, delta?, key?, value?, text? }`
   - `event: done` → `data: { text: string }`
   - `event: error` → `data: { error: string }`
   Verify the client parser in `src/agentClient.ts` handles ALL event types the server can emit.

4. **Effect event completeness**: Read `server/tools.ts` to see what tool calls the agent can make. Each tool should produce an `effect` event. Verify:
   - `adjust_relationship` → `{ type: 'relationship', walkerId, delta }`
   - `adjust_morale` → `{ type: 'morale', delta }`
   - `set_flag` → `{ type: 'flag', key, value }`
   - `share_info` → `{ type: 'info', text }`
   Then verify `src/agentClient.ts` and `src/ui.ts` handle each effect type and apply state changes correctly.

5. **WalkerProfile / GameContext type parity**: The server defines `WalkerProfile` and `GameContext` in `server/prompts.ts`. The client builds these in `src/ui.ts` or `src/agentClient.ts`. Compare field-by-field:
   - Are there fields the server expects but the client doesn't send?
   - Are there fields the client sends but the server ignores?
   - Do arc-related fields (arcPhase, promptHint, conversationCount, revealedFacts, playerActions) match?

6. **Error handling consistency**:
   - What HTTP status codes does the server return on error?
   - Does the client handle non-200 responses?
   - Does the client handle SSE stream errors (connection drop, timeout)?
   - Is the 15-second client timeout appropriate for LLM response times?
   - Is the 2-second health check timeout sufficient?

7. **CORS configuration**: Read the CORS middleware in `server/index.ts`:
   - What origins are allowed?
   - Are SSE-specific headers set (`Cache-Control: no-cache`, `Connection: keep-alive`)?
   - Content-Type for SSE responses: `text/event-stream`

8. **Conversation history management**:
   - Client sends `walkerId` as a URL parameter — is it used consistently for history lookup?
   - Server maintains history in `server/agents.ts` — verify `addToHistory` is called after each exchange
   - Check the 20-message cap is enforced on both user and assistant messages
   - What happens if the server restarts mid-conversation? (History is in-memory)

9. **Approach endpoint specifics**: The `/api/approach` endpoint is newer (v0.4.0). Verify:
   - Request body includes approach type and context
   - Response is a short 1-2 sentence opening (not a full conversation)
   - Client handles the streaming response correctly in the approach banner

10. **Content-Type headers**: Verify:
    - POST requests send `Content-Type: application/json`
    - SSE responses set `Content-Type: text/event-stream`
    - Health check returns `application/json`

## Anti-Patterns to Flag
- Type definitions duplicated between client and server instead of shared
- SSE events with no client handler (silently dropped)
- Missing error event handling in SSE stream
- Request body fields that exist on one side but not the other
- Hardcoded server URL in client (should use environment-based config)
- No timeout on SSE connections (could hang indefinitely)
- WalkerId passed as string but treated as number (or vice versa)

## Output Format
Report findings as:
- **CRITICAL**: [issue] — [file:line] — [why it matters]
- **WARNING**: [issue] — [file:line] — [recommendation]
- **INFO**: [observation] — [file:line]

End with: Summary paragraph + Top 3 recommended actions.
