# Claude + Codex workflow

## Mandatory shared context

Before planning or editing, read:

1. `PROJECT_STATE.md`
2. `DECISIONS.md`
3. `AI_HANDOFF.md`
4. `marketing/CONTEXT.md` for marketing work

The project `SessionStart` hook injects these files, recent commits, and the current Git status automatically on startup, resume, clear, and compaction. If injected context conflicts with repository evidence, verify the repository and correct the shared files.

After material work, update `AI_HANDOFF.md` with the outcome, changed files, checks, unresolved risks, and next recommended action. Update `PROJECT_STATE.md` when actual state changes. Append to `DECISIONS.md` only after an explicit owner decision. Never store passwords, tokens, API keys, personal customer data, or credentials in these files.

Codex and Claude do not share chat transcripts. Files and Git are the source of continuity.

Claude is the coordinator for this repository. Use Codex selectively through the installed `codex@openai-codex` plugin.

## Routing

- Handle trivial questions, tiny edits, copy changes, and straightforward one-file work directly. Do not delegate them.
- Delegate implementation, debugging, repository-wide refactors, test failures, and multi-file changes with `/codex:rescue` when Codex is likely to produce a better result.
- For research, requirements, product decisions, and architecture, Claude leads. Delegate only a bounded technical investigation when repository evidence is needed.
- For security-sensitive, data-loss, authentication, payment, migration, or release-critical work, use one implementation agent and one independent review agent.

## Cost controls

- Default to one model doing the work. Never ask Claude and Codex to independently perform the same task unless independent verification is justified by risk.
- Use at most one delegation and one review cycle per user request. A second cycle requires a concrete unresolved defect.
- Run long work in the background. Ask Codex for a concise summary, changed files, verification results, and remaining risks rather than raw logs.
- Do not invoke Codex for work that takes less time to complete directly than to explain and review.
- Use `/codex:review` only for material code changes, risky changes, or before shipping. Skip it for documentation-only and cosmetic micro-edits.

## Handoff contract

Every delegation must include the objective, exact scope, constraints, relevant files, acceptance criteria, and required checks. Codex must preserve user changes and must not commit, push, deploy, delete data, or add production dependencies without explicit user authorization.

## Owner request bridge

For every substantial raw owner request, automatically apply the protocol in `.claude/commands/dukenim-brief.md` before planning, editing, or delegating. Do this even when the current Claude interface does not expose custom slash commands: the owner should be able to write naturally, without typing `/dukenim-brief`.

First return a concise Russian block headed `# Задача для Codex`, following that protocol. Then either handle the bounded work directly or delegate the exact brief. Preserve all explicit owner constraints, verify project facts from the repository, and never invent technical causes, prices, legal claims, credentials, or completion. Skip this protocol only for trivial questions and cosmetic one-line edits.

After Codex returns, Claude verifies the evidence, resolves disagreements using code and tests, and gives the user one unified answer. Do not expose internal model debate unless it changes the recommendation.

## Project checks

- Type check: `npx tsc --noEmit`
- Production build: `npm run build`
- Preserve Next.js 15, strict TypeScript, Supabase/RLS tenant isolation, integer KZT prices, and stock mutations through `stock_movements`.
