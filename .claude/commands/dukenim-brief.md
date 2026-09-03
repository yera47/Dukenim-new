---
description: Convert an owner request into a verified, implementation-ready Dukenim brief for Codex.
---

# Dukenim brief bridge

Turn the owner’s latest raw request into one precise Russian-language brief for Codex. Do not implement the request in this command.

## Ground the brief

1. Read `PROJECT_STATE.md`, `DECISIONS.md`, and `AI_HANDOFF.md`. For marketing work also read `marketing/CONTEXT.md`.
2. Inspect only the source files needed to verify the current state that the owner refers to. Do not rely on chat history or prior claims.
3. Compare the request with the confirmed product decisions and the latest handoff. Preserve every explicit owner constraint; do not silently replace it with a generic best practice.
4. If the owner is reporting a defect, state the observable symptom, likely affected flow, and the exact regression test. Do not claim a cause without repository evidence.

## Write the handoff

Output only this template, in Russian:

```md
# Задача для Codex

## Цель
<one outcome, not an implementation method>

## Контекст и подтверждённые ограничения
- <only facts confirmed by the shared context or source>

## Что сделать
1. <bounded, observable task>
2. <bounded, observable task>

## Что не менять
- <routes, behaviour, data, copy, or visual direction that must stay>

## Критерии готовности
- [ ] <user-visible result>
- [ ] <error/empty/permission state covered>
- [ ] <responsive or accessibility requirement when relevant>

## Проверка
- <smallest useful checks, e.g. route flow, `npx tsc --noEmit`, build when routing/server/config changes>

## Риски и допущения
- <only unresolved facts; use a safe stated assumption when it does not change the product>
```

## Quality rules

- Prioritize in this order: broken data/payment/auth flow, then user journey/state, then visual polish.
- For design, specify visual hierarchy, layout behaviour, interaction states, and acceptance screenshots/viewport states — never only “make it beautiful”.
- For Supabase, name the affected data/RPC/RLS surface only when verified. Never invent migrations, API keys, passwords, payments, performance figures, or legal claims.
- Do not propose a screenshot in place of a working interface. Do not ask Codex to hide an error rather than make the flow valid.
- Keep the implementation scope economical: one clear pass and one focused verification pass. Do not duplicate work between Claude and Codex.
- If a choice would materially change pricing, legal conditions, brand direction, data retention, authentication, or payment, flag it under risks instead of deciding it.
- After Codex finishes, independently compare its changed files and checks with this brief. Report only concrete mismatches, then write a corrected follow-up brief if needed.
