# Dukenim

Полный MVP мультитенантной платформы: витрина, кабинет владельца и superadmin-панель на защищённой схеме Supabase.

## Запуск

1. Скопируйте `.env.example` в `.env.local` и вставьте ключи Supabase.
2. Выполните `npm install`.
3. Для локальной БД: `npx supabase start`, затем `npx supabase db reset`.
4. Запустите `npm run dev` и откройте `http://localhost:3000`.
5. Production-проверка: `npm run build`.

Миграция создаёт все таблицы, RLS, триггеры и Storage bucket. Seed создаёт демо-магазин и товар. Аккаунты Auth создайте в Supabase Dashboard, затем подставьте их UUID в закомментированные строки в конце `supabase/seed.sql`.

## Демо-разделы

- Витрина: `/s/demo-shop`
- Вход: `/login`
- Кабинет владельца: `/admin`
- Superadmin: `/root`

Без `.env.local` проект работает в демонстрационном режиме. После добавления Supabase middleware включает серверную проверку пользователя и роли. Реальная интеграция Kaspi заменяет только тело `processPayment()` в `src/lib/payment.ts`.
