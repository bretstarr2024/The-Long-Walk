Review security posture of this codebase.

## Context
Read these files first:
- `.claude/CLAUDE.md` — Project rules
- `server/index.ts` — All HTTP endpoints and CORS config
- `server/agents.ts` — Agent factory and history cache
- `server/prompts.ts` — System prompt builder (LLM injection surface)
- `src/agentClient.ts` — Browser-side API calls
- `.gitignore` — Verify secrets exclusion
- `.env` — Check what's stored (DO NOT output the actual key values)

## What to Check

1. **API key exposure**: Verify `OPENAI_API_KEY` is only in `.env`, `.env` is in `.gitignore`, and the key is never logged, sent to the client, or included in error responses. Check `server/index.ts` for any `process.env` leaks in HTTP responses.

2. **CORS configuration**: Read the CORS setup in `server/index.ts`. Verify it's not `origin: '*'` in production. Check that only the Vite dev server origin is allowed.

3. **Input validation on endpoints**: Check all three SSE endpoints (`/api/chat/:walkerId`, `/api/overhear`, `/api/approach`):
   - Is `walkerId` validated (numeric, within range 1-99)?
   - Are request body fields validated before use?
   - What happens if `walker` or `gameContext` is missing or malformed?

4. **LLM prompt injection**: Read `server/prompts.ts` — `buildSystemPrompt()` and `buildGameContextBlock()`. Check if user-controlled input (player messages, walker names) is concatenated into prompts without sanitization. Verify the system prompt instructs the model to stay in character and reject out-of-character requests.

5. **SSE response sanitization**: In `server/index.ts`, check if LLM output is sanitized before being sent as SSE data. Malicious LLM output could contain SSE control characters (`\n\n`, `event:`, `data:`) that break the stream protocol.

6. **XSS via LLM output**: In `src/ui.ts`, check how LLM responses are rendered. If `innerHTML` is used with LLM-generated text, it's an XSS vector. LLM text should be set via `textContent` or properly escaped before HTML insertion.

7. **Denial of service vectors**:
   - Is there a request rate limit on the server endpoints?
   - Can a client open unlimited SSE connections?
   - Is conversation history unbounded? (Check `server/agents.ts` — should cap at 20 messages)
   - Can `walkerId` be manipulated to create unlimited agent instances?

8. **Client-side secrets**: Search `src/` for any hardcoded API keys, tokens, or secrets. The client should never contain server credentials.

9. **Error handling**: Check if server error responses leak internal details (stack traces, file paths, environment variables). Read error handlers in `server/index.ts`.

10. **Dependency audit**: Check `package.json` dependencies for known vulnerabilities. Note the versions of `hono`, `@openai/agents`, `vite`, and `tsx`.

## Anti-Patterns to Flag
- `innerHTML` with unsanitized LLM output (XSS)
- `process.env` values in HTTP response bodies
- Missing input validation on `walkerId` parameter
- CORS `origin: '*'`
- Raw string concatenation of user input into LLM prompts without framing
- Error responses that include stack traces or internal paths
- No rate limiting on LLM proxy endpoints

## Output Format
Report findings as:
- **CRITICAL**: [issue] — [file:line] — [why it matters]
- **WARNING**: [issue] — [file:line] — [recommendation]
- **INFO**: [observation] — [file:line]

End with: Summary paragraph + Top 3 recommended actions.
