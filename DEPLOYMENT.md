# Публикация Dukenim на dukenim.kz

Эта инструкция рассчитана на первый production-запуск проекта из репозитория `yera47/Dukenim-new`.

## 1. Что понадобится от владельца

- Доступ к GitHub-аккаунту, где находится репозиторий.
- Аккаунт Supabase и выбранный регион проекта.
- Аккаунт Vercel, подключённый к GitHub.
- Доступ к DNS-панели регистратора домена `dukenim.kz`.
- Production-email владельца и superadmin вместо демо-адресов.
- Логотип, реальные товары, условия доставки, оферта и политика конфиденциальности.
- Для настоящей онлайн-оплаты — официальный merchant-договор и API-реквизиты провайдера. Секретный ключ нельзя отправлять в чат или добавлять в Git.

## 2. Создать production-проект Supabase

1. В Supabase нажмите **New project**, выберите организацию, регион и сильный пароль базы.
2. Сохраните пароль в менеджере паролей.
3. Откройте **Project Settings → API** и скопируйте:
   - Project URL;
   - anon/publishable key;
   - service_role/secret key.
4. `service_role` храните только в серверных переменных Vercel. Никогда не используйте префикс `NEXT_PUBLIC_` для этого ключа.

## 3. Применить структуру базы

В PowerShell из папки проекта:

```powershell
npx supabase login
npx supabase link --project-ref ВАШ_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Команда применит по порядку файлы из `supabase/migrations`. Не запускайте `supabase db reset --linked` на production: reset удаляет данные.

Затем один раз откройте **Supabase → SQL Editor**, вставьте содержимое `supabase/seed.sql` и нажмите **Run**. Seed создаёт тестовый магазин и два Auth-аккаунта. Сразу после проверки войдите под каждым аккаунтом и замените демо-пароли:

- `owner@dukenim.kz` / `DukenimOwner123!`
- `root@dukenim.kz` / `DukenimRoot123!`

Перед повторным запуском seed проверьте его на тестовом проекте.

## 4. Настроить Supabase Auth

В **Authentication → URL Configuration** задайте:

- Site URL: `https://dukenim.kz`
- Redirect URLs: `https://dukenim.kz/**`
- Дополнительно для preview: `https://*-имя-команды.vercel.app/**`

В **Authentication → Providers → Email** оставьте Email provider включённым. Для реального продукта подключите собственный SMTP, иначе письма Supabase имеют ограничения и не подходят для массовой production-отправки.

## 5. Опубликовать через Vercel

1. В Vercel нажмите **Add New → Project**.
2. Импортируйте GitHub-репозиторий `yera47/Dukenim-new`.
3. Framework Preset: **Next.js**. Root Directory оставьте `./`.
4. В **Environment Variables** добавьте для Production и Preview:

```text
NEXT_PUBLIC_SUPABASE_URL=https://ВАШ_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ВАШ_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=ВАШ_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=https://dukenim.kz
```

5. Нажмите **Deploy**. После первого успешного деплоя проверьте временный адрес `*.vercel.app`.

## 6. Подключить dukenim.kz

1. Откройте **Vercel → Project → Settings → Domains**.
2. Добавьте `dukenim.kz` и `www.dukenim.kz`.
3. Для каждого домена Vercel покажет требуемые DNS-записи. Скопируйте именно показанные значения в DNS-панель регистратора: актуальный IP может отличаться от старых примеров в интернете.
4. Обычно для корня домена используется запись `A`, а для `www` — `CNAME`, но источником истины остаётся экран Vercel.
5. Сделайте `dukenim.kz` основным доменом, а `www.dukenim.kz` перенаправьте на него.
6. Дождитесь проверки DNS. Распространение записей иногда занимает до 24 часов; TLS-сертификат Vercel подключит автоматически.

## 7. Финальная проверка

- `https://dukenim.kz` открывается по HTTPS без предупреждений.
- `/s/demo-shop` показывает товары, корзина создаёт заказ.
- Вход владельца ведёт в `/admin`, superadmin — в `/root`.
- Владелец не видит данные другого магазина.
- Basic не получает закрытые функции Standard/Pro.
- Создание/редактирование товара, загрузка изображения и изменение остатка работают.
- Новый заказ появился в кабинете и superadmin-панели.
- В консоли браузера и Vercel Functions нет ошибок.
- Демо-пароли заменены, `service_role` отсутствует в исходном коде и клиентских ответах.

## 8. После запуска

- Подключить SMTP и проверить письма регистрации/восстановления.
- Подключить Sentry или другой мониторинг ошибок.
- Настроить резервное копирование Supabase по выбранному тарифу.
- Добавить реальные юридические документы и контакты.
- Реализовать настоящий платёжный адаптер только по официальной документации и реквизитам провайдера.
- Проверить сайт и оплату на отдельном тестовом магазине перед включением для клиентов.
