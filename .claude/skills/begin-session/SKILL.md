---
name: begin-session
description: Read-only session startup — load context, check health, present briefing
user-invocable: true
---

# /begin-session

You are starting a new working session on **The Long Walk** — a survival simulation game (Vite + TypeScript client, Hono + OpenAI Agents server). This skill is **strictly read-only** — diagnose, never treat. Report the state of the world and ask what to work on.

Execute these steps in order. Do NOT modify any files, make commits, or take corrective action.

---

## Step 1: Locate latest session artifacts

Session artifacts live in `docs/sessions/`. Find the most recent:
- **Ledger** (YAML): `docs/sessions/SESSION_LEDGER_*.yaml` — sort by date in filename
- **Handoff** (Markdown): `docs/sessions/HANDOFF_*.md` — matching date

Read both the latest ledger and handoff in full. Extract:
- `session_id`, `date`, `version`, `prior_session`
- `commits` (hashes and messages)
- `decisions_made` (preserve these — don't re-debate)
- `open_questions`
- `known_risks`
- `explicitly_deferred`
- `next_actions` (these are the carry-forward items)

If no session artifacts exist at all (first time), say so and skip to Step 4.

---

## Step 2: Git health check

Run these commands and report results:

```bash
git branch --show-current
git status --short
git log --oneline -1
git log --oneline <last_session_commit>..HEAD
```

Report:
- **Branch:** (should be `main`)
- **Working tree:** Clean / Dirty (list files if dirty)
- **HEAD:** commit hash + message
- **Commits since last session:** list any commits not from the previous session

---

## Step 3: Build verification

### Client (Vite + TypeScript)
```bash
cd "/Volumes/Queen Amara/The Long Walk" && npx tsc --noEmit 2>&1 | tail -20
```
Report: PASS (no errors) or FAIL (list errors). Do NOT attempt to fix.

### Server (if server/ exists)
```bash
cd "/Volumes/Queen Amara/The Long Walk" && npx tsc --noEmit -p server/tsconfig.json 2>&1 | tail -20
```
Report: PASS or FAIL. If server/ doesn't exist yet, note "Server not yet implemented."

---

## Step 4: Load memory

Read these files in parallel:
1. **MEMORY.md**: `~/.claude/projects/-Volumes-Queen-Amara-The-Long-Walk/memory/MEMORY.md`
2. **CLAUDE.md**: `/Volumes/Queen Amara/The Long Walk/.claude/CLAUDE.md`
3. **CHANGELOG.md**: `docs/CHANGELOG.md`

From MEMORY.md, extract:
- Known issues and bugs
- Architecture patterns and conventions
- Key file locations

---

## Step 5: Present structured briefing

Output this exact format:

```
## Session Briefing — The Long Walk

### Last Session
- **Session ID:** {from ledger}
- **Date:** {from ledger}
- **Summary:** {2-3 sentence summary from handoff}

### Environment
- **Branch:** {current branch}
- **Working tree:** {clean/dirty}
- **HEAD:** {commit hash} — {message}
- **External changes since last session:** {list or "None"}

### Build Status
- **Client (TypeScript):** {PASS/FAIL}
- **Server:** {PASS/FAIL/Not implemented}

### Carry-Forward Items
{Numbered list from ledger's next_actions}

### Known Risks
{From ledger's known_risks}

### Current Version
{From CHANGELOG.md}

---

What would you like to work on this session?
```

---

## Rules

1. **Read-only.** Never modify files, make commits, or take corrective action.
2. If builds fail or tree is dirty, **report it** and let the user decide what to do.
3. If no session artifacts exist yet, say "No previous session artifacts found" and present what you can (git state, build status).
4. Don't ask exploratory questions beyond the final "What would you like to work on this session?"
5. Keep the briefing concise — the handoff doc has the details if the user needs them.
