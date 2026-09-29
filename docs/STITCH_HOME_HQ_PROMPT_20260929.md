# Stitch continuation prompt — merchant Home and Dukenim HQ

Continue the existing Dukenim project. Do not restart it, rename existing approved screens, or create another disconnected concept. Create one linked flow named **Home & HQ completion 2026-09-29**. Keep all existing merchant and HQ screens available, but replace unfinished or contradictory variants in this new flow.

## Product truth

- This is a mobile business application backed by real shared website data. Stitch is the interaction and visual specification only.
- Never present invented numbers, people, payment confirmations, MFA states, bank reconciliation, refunds, integrations, or diagnostics as live facts. Use clearly labelled `Пример`, `Демо`, `Нет данных`, `Не настроено`, `Недоступно` or `Запланировано` states where a mock needs content.
- Payment via Kaspi is manual: the merchant shares a Kaspi Pay link and personally marks payment. Never claim bank verification or automatic reconciliation.
- Do not show a barcode scanner. Do not copy 2GIS, On Running, Apple, Telegram, or any other third-party visual identity.

## Shared visual system

- iPhone portrait, white base, graphite text, deep slate `#183247`, restrained burgundy `#56334D`, pale burgundy surfaces, exact supplied Dukenim logo.
- Large clear headings, strong hierarchy, 20–28 px rounded cards, minimum 44 pt tap areas, calm spacing and compact copy. No crowded dashboard wall.
- Keep the original Dukenim 3D business illustrations as supporting objects. Motion should be subtle: independent low-amplitude floating layers, static controls and data, and a reduced-motion alternative.
- Root bottom glass navigation: `AI Studio`, `Каталог`, `Заказы`, `Главная`. `Главная` replaces `Ещё`. Keep it visible only on root screens; nested screens use a single arrow-only Back button at top left and no bottom bar.

## Merchant `Главная`

Design the signed-in default landing screen for a ready store. It must be useful in five seconds and use this order:

1. Compact illustrated store hero with store name and truthful publication state.
2. `Коротко о продажах`: four small cards — manually marked paid revenue today, orders today, new orders, low-stock active variants. Add loading, empty, unavailable and retry states. If a read fails, hide the whole affected total instead of showing zero.
3. A compact seven-day bar chart for manually marked paid, non-cancelled orders. Link to Analytics. No fake values in the production state.
4. A dark `Каталог` control card showing real product count and `Черновик`/`В эфире`. It must expose five obvious actions:
   - `Добавить товар` — photo, name, price and opening stock;
   - `Товары` — list and edit product cards;
   - `Дизайн` — template, palette, logo, cover and storefront text;
   - `Предпросмотр` — buyer view before publication;
   - `Ссылка` — copy/share; disabled with an explanation while unpublished.
5. Compact cards for Orders and AI Studio, followed by grouped secondary functions: stock, clients, employees, analytics, delivery/payment, field sales, integrations and settings.
6. For multiple stores, include a compact store switcher and refresh every displayed value when the selection changes.

Also design the Catalog root state so the same `Оформление`, `Предпросмотр`, and `Ссылка магазина` actions remain visible above the product list. Catalog is a root tab and must not show a Back button.

## Dukenim HQ / superadmin completion

Finish the admin flow as a coherent protected internal workspace, using the already-created HQ screens as source material. Do not merge merchant controls into HQ and do not invent capabilities. Include linked screens and honest loading/empty/error/permission states for:

- Overview with real totals for stores, new orders, open requests and active field trips;
- store registry, detail, create/edit, publication, guarded multi-select deletion, and protected internal-store state;
- accounts, login access, staff memberships and detailed permission editing;
- platform orders, order detail and guarded unpaid cancellation;
- promotions and incoming requests;
- integrations and CRM review;
- diagnostics and AI operations;
- finance/audit records, exports, and clear `not bank reconciliation` wording;
- field-sales zones, map/prospect detail, trip start, current stop, outcome, next stop, early finish, history and reminders;
- System screen and a clear return to the merchant workspace.

For refunds, bank reconciliation, global session revocation and any function that has no verified backend action, make the control visibly unavailable and explain why. Do not render it as successful or connected.

## Required linked states

Create at least these linked frames: Merchant Home loaded; Merchant Home loading/error/empty; Catalog root; unpublished Catalog card; HQ Overview; HQ Stores; HQ Store Detail; HQ Accounts and Permissions; HQ Orders and Order Detail; HQ Field Sales and Trip; HQ Requests/Promotions; HQ Integrations/Diagnostics; HQ Finance/Audit; HQ System. Use consistent navigation and ensure no action ends in a dead frame.

Before finishing, perform a visual consistency pass: no clipped text, no overlapping illustration and copy, no hidden primary action behind the keyboard or bottom bar, no horizontal overflow, no duplicate Back controls, and no demo status that looks real.
