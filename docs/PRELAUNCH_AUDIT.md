# Предпусковой аудит — 2026-09-08

## Рабочий промпт

Довести текущий Dukenim до проверяемого запуска продаж. Не начинать новый редизайн. Сначала воспроизвести критический путь: регистрация → AI Studio → оформление → сохранение → товар → публичная витрина → заказ → кабинет владельца. Проверить повторную отправку, обновление страницы, ошибки сети, изоляцию магазинов и отсутствие ложных подтверждений. Исправлять подтверждённые дефекты небольшими проверяемыми изменениями. Затем проверить подписки отдельно от платежей покупателей, поддержку, права root, резервные копии и публичные обещания. Публиковать только после TypeScript, тестов и build; проверять production после деплоя. Отдельно перечислять непроверенные сценарии. Не удалять пользователей до определения сохраняемого администратора, точного набора целей и зависимых данных.

## Проверено в этом проходе

- Read-only production inventory: 15 Auth accounts, 14 stores, 5 orders; profile roles include two superadmins. This does not establish which records are disposable tests. No accounts deleted.
- Supabase security advisor: warnings for executable SECURITY DEFINER authorization helpers and disabled leaked-password protection. Helpers require body/policy review, not blind revocation that could break RLS.
- Confirmed order endpoint defect: absent database configuration returned a simulated successful order. Removed this fallback. Demo simulation remains explicitly client-side. Added missing-configuration and invalid-input regressions.

## Release gates still open

1. Authenticated isolated first-run E2E, including persisted read-back after refresh; do not reset the owner's store.
2. Catalog setup currently writes theme and lifecycle separately; partial failure/concurrent creation is not atomic.
3. Owner product edits can ignore variant/stock write errors; audit and repair error propagation and concurrent stock changes.
4. Public order abuse/idempotency and transaction/stock lifecycle review; current API validation alone is not sufficient evidence.
5. Actual signed subscription/AI-credit webhook and payout readiness; buyer online payment is not supported by the current cash-only order API.
6. Backup job and successful restore verification; company/legal details and operator support readiness.
7. Account deletion pending exact retained admin identity and test/all-data scope. Existing orders must not be presumed disposable.

Do not label the entire product ready for unrestricted sales until these gates have evidence. Passing unit tests or a demo video is not a real authenticated commerce E2E.
