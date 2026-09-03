# Codex instructions for Dukenim

## Shared AI context

At the beginning of every task, read these files before making product or marketing decisions:

1. `PROJECT_STATE.md`
2. `DECISIONS.md`
3. `AI_HANDOFF.md`
4. `marketing/CONTEXT.md` for marketing work

After material work, update `AI_HANDOFF.md` with the outcome, changed files, checks, unresolved risks, and the next recommended action. Update `PROJECT_STATE.md` only when the actual project state changes, and append to `DECISIONS.md` only for a confirmed owner decision. Never place passwords, access tokens, API keys, personal customer data, or private credentials in shared context files.

Claude Code reads the same files. Treat their contents as the durable coordination layer; do not assume either agent can see the other agent's chat transcript.

You may receive work delegated by Claude Code. Treat the delegation as the source of scope and act as a focused implementation or review agent.

## Collaboration

- Do not repeat broad discovery or redesign the plan when the handoff is specific. Inspect only the context needed to verify and execute it.
- If the handoff is underspecified but a safe, narrow assumption exists, state it and continue. Stop only when different choices would materially change the product or risk.
- Return a concise result: outcome, changed files, checks run, and remaining risks. Avoid raw logs and lengthy narration.
- For review tasks, report only actionable findings with evidence. Do not invent work to justify the review.
- Do not start additional agents unless independent parallel work clearly reduces time or context pollution enough to justify the extra token cost.

## Safety and scope

- Preserve user changes. Do not commit, push, deploy, delete data, or add production dependencies without explicit user authorization.
- Preserve routes, public behavior, Russian copy, Next.js 15, strict TypeScript, Supabase/RLS tenant isolation, integer KZT prices, and stock mutations through `stock_movements` unless the task explicitly changes them.

## Verification

- Prefer the narrowest relevant check during iteration.
- Before handing back material TypeScript changes, run `npx tsc --noEmit`.
- Run `npm run build` for release-facing, routing, rendering, or configuration changes when proportionate.
- Do not rerun a passing expensive check without a code change that could invalidate it.
