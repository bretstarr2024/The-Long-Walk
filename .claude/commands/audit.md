Run ALL 8 code review commands in parallel and present a consolidated report.

## Instructions

Launch all 8 review skills simultaneously using the Task tool (subagent_type: "general-purpose"). Each agent should execute one review skill. Run them ALL in parallel — do not wait for one to finish before starting the next.

The 8 reviews to run:
1. `/review-architecture`
2. `/review-security`
3. `/review-performance`
4. `/review-data-integrity`
5. `/review-frontend`
6. `/review-api-contracts`
7. `/review-game-logic`
8. `/review-llm-integration`

For each review, launch a Task agent with the prompt: "Run the /review-{name} skill and return the full results."

## After All Reviews Complete

Present a **consolidated audit report** with:

### Critical Issues
All CRITICAL findings from every review, deduplicated (many reviews flag the same issue). Include file:line references.

### Warnings
Notable WARNING findings, grouped by theme. Skip duplicates already covered in criticals.

### Top Actions
Ordered list of recommended fixes by severity, with the number of reviews that flagged each issue.

Keep the report concise — the individual review details are available via the individual `/review-*` commands if needed.
