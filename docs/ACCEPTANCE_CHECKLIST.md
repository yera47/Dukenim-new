# Dukenim — единый контроль выполнения

## Owner workspace redesign — 2026-09-11

Release evidence: eff54dc deployed, authenticated production Studio button contrast/separation, live Azure card-payment reply/link, r_keeper modal/support prefill, Sep1–11 calendar report and team directory verified.48488d4 pushed/build74passed with compact new-request form and guarded empty-store removal (applied migration, rollback tests); actual store deletion not performed. Below parent requirements remain open where mutation/mobile/billing acceptance is incomplete; this is not a complete release of the full request.

| Requirement | Status | Acceptance |
|---|---|---|
| Readable Studio actions, concise proposal | in progress | Contrast, separation, mobile visual check |
| Integration requests instead of full provider grid, status/support dialog | in progress | Production modal/prefill checked; support submit and changed-status round trip pending |
| AI help and request routing | in progress | Source8b9ba91: inline review/send/open card;421tests/tsc/build pass; applied retry guard with tenant/RLS/replay SQL verification. Production8b9ba91 verified payments-card edit/cancel/reopen/send/thread/reload/retry (one request/message). All four kinds server-tested; mobile390 override failed to apply, audit open. Support intake does not connect a provider; root reply/status round trip remains open. |
| Root management and deletion audit | in progress | Guarded permanent empty-store delete and audit rollback-tested; no real deletion, full root audit pending |
| Analytics custom calendar and selected state | in progress | Valid inclusive date range, revenue/profit same range |
| Compact team list and permission editor | in progress | Existing members, invitations, save/revoke persistence |
| Tariff differentiation / CRM 70000 after connection | in progress | Applied server cap200/2000, AIboth; fee invoice/payment and full gates incomplete |
| Campaigns in catalog, controlled percentage input | in progress | Existing campaign CRUD moved, rootpercentage slider; browser save pending |
| Sitewide status/contrast audit and deployment | in progress | Relevant automated and browser checks |

## Current checkpoint — 10.09 17:08

11.09 recovery acceptance: **verified** — 4ed4814 deployed (Vercel success); authenticated production reload restores conversation, proposal notice and original saved-generation preview. No new generation/application. Build74, 8 focused tests and TypeScript pass. Broader owner apply/re-login/publication remains **in progress**.

11.09 recovery: source through4faa7a4 and saved design8e1a50dd confirmed intact (read-only DB, prior deployment success). Found page restored structure only; latest saved design was not hydrated after reload. Added session/RLS tenant-filtered latest-design read and initial proposal/preview restoration without generation/application.8focused tests and tsc pass; release/browser verification in progress. This does not close owner apply/re-login/publication acceptance.

19:12 personal assembly: source073489c deployed, applied20260910140146. Verified live model returns requested colors+layout+sections; validated layout persists through catalog creation, staff apply and undo in rollback DB tests. Shared renderer tests pass. Overall personal assembly remains in progress until owner browser/re-login/publication acceptance; not unrestricted generated code. Detailed remaining audit: PERSONAL_ASSEMBLY_AUDIT_20260910.md.

18:54 update: staff saved-design preview/apply implemented using the common StoreHome renderer; studio write, active plan and CAS updated_at enforced by applied RPC. Rollback regression confirms read-only/revoked denial, persistence/history and unchanged storefront publication flag. 383 tests pass; employee browser E2E remains in progress. Stock name/SKU/variant search and availability filters implemented. CRM comparison covers6official documentation sets, not all25registry entries. Personal unrestricted assembly remains internal unfinished work; see CRM_PRODUCT_COMPARISON_20260910.md.

18:32 update: staff product/photo creation implemented (up to4 JPEG/PNG/WebP,3MB total, decoded/re-encoded server-side, hidden initially). Applied RPC checks actual membership and stock permission, tenant lifecycle, own image path, replay ID; tests confirm stored product/stock and denied/revoked access. 376 tests/tsc/build pass. Staff browser upload/invitation acceptance still in progress; employee email requested. Studio design publishing is still internal unfinished work, not blocked by that email. Previous reservation clarification deployment Ready confirmed.

New scope remains **in progress** until authenticated browser acceptance, not just compilation. Staff invite/accept/revoke and scoped module RPCs are now implemented and transaction-tested; older notes saying no server authorization describe previous checkpoints. Buyer order tracking now uses signed HttpOnly receipts, tenant/ID scoping and polling. Pickup readiness is seller-driven, reservation expiry suppresses readiness. Local owner team screen verified; employee email acceptance/login and a real buyer order browser round trip are still unverified. Azure consultation and exact pink/green design passed live again. No acquiring or native release.

| ID | Requirement | Status | Evidence / remaining acceptance |
|---|---|---|---|
| 28 | Staff invitation, roles, per-module server access | in progress | Five applied migrations; rollback test `supabase/tests/staff_access_regression.sql`; local owner team screen. Employee email/login acceptance not yet verified; staff catalog editor currently updates existing products, not media upload/creation; staff Studio creates conversation proposals, not owner publishing actions. |
| 29 | Buyer My Orders and live readiness | in progress | Signed receipt and API tenant/ID isolation tests; order/expiry progression tests; checkout/reservation redirect; polling. Real buyer/seller browser transaction not yet verified. History is browser-bound, last 20 receipts/30 days. |
| 30 | Working days/hours and clear hold durations | in progress | Native day/time controls and Russian duration labels; focused tests pass. Owner settings save/reload not yet verified. |
| 31 | Staff notifications | in progress | Order trigger queues only opted-in authorized staff; sender rechecks current access. Native delivery on a registered device remains unverified; app is paused by owner. |

## Earlier checkpoints

10.09 15:47: выбор7рабочих дней/времени добавлен локально в мастер, самовывоз и бронь.13focusedtests/tsc проходят; сохранение через интерфейс/деплой не проверены. Новые задачи покупательских статусов, приглашений и серверных прав сотрудников остаются в работе, не являются внешними блокерами. auth.ts/status-action.ts подтверждают отсутствие текущего staff-flow.

10.09 15:12: настоящий owner PUT черновика → подтверждение → reload → открытие мастера восстанавливает шаг3. Это не повторная авторизация/публикация. Новые раздельные поля адреса покупателя локально:3теста,tsc/build проходят. Azure диалог и точные цвета/разделы живые тесты прошли. Новый запрос «свой курьер/Яндекс с уточняемой стоимостью» — не начат; нельзя заменять неизвестную цену бесплатной доставкой. Полный путь и остальные незакрытые ID остаются в работе.

Обновлено 2026-09-10. Статусы: не начат / в работе / проверен / внешне заблокирован. «В работе» не означает готовность. Прежние исследования и релизы учитываются как частичные доказательства, а не как закрытие требований.

10.09: эквайринг снова в исследовании по позднему запросу владельца, договор/реальная оплата не подключены. ID24:18маршрутных вариантов и отличающиеся композиции на общем engine;36новых browser journeys390/1440 прошли локально. ID27: приватные себестоимости и неизменный snapshot проверены в DB. Authenticated UI/relogin ещё не проверен. Новая фотосерия Higgsfield не запускалась:5кредитов при цене2/фото недостаточно на весь набор.

PDF.js разрешён, приложение/TestFlight на паузе владельца. PDF text import10МБ/40стр/30с реализован, визуальный анализ ещё не реализован. Бронь готового товара опубликована ea0b670 и проверена транзакционно; полная браузерная приёмка остаётся открытой. Новые композиции/встраивание brand-step локальные до подтверждения релиза.

| ID | Требование | Статус | Факты и недостающая проверка |
|---|---|---|---|
| 01 | Прикладное исследование и применение | в работе | Источники/решения в CONVERSATIONAL_COMMERCE_20260908.md; ещё проверить карты и AI-конструкторы |
| 02 | Полный пошаговый AI-диалог | в работе | Добавлен consultation: реальные ответы Azure, история 8 последних пар для модели/30 для UI, передача task brief в редактор. Живой серверный тест прошёл. Полная автоматическая сборка и UI E2E ещё не завершены |
| 03 | Логотип, необязательный брендбук, референсы | в работе | Приватный логотип/цвета/правила и text PDF есть.10.09 добавлен реальный просмотр выбранной PDF-страницы перед отправкой Azure, ограничение размера/пикселей и проверяемые рекомендации без действий. Реальный PDF browser render и Kimi two-colour page test проходят. Полный документ автоматически не анализируется; owner upload→rules save→design ещё не проверен |
| 04 | Индивидуальная композиция/цвет/шрифт | in progress |073489c deployed: validated layout_config задаёт6параметров независимо от шаблона. Живой Azure + DBcreate/undo/staff + production chat→proposal→preview проверены.403tests. Полный owner apply/re-login/publication открыт; произвольные новые компоненты не генерируются |
| 05 | Ручные и AI-правки после запуска | в работе | Формы/apply и latest-state CAS undo RPC есть; реальный rollback/replay/tenant SQL тест пройден. UI conflict/undo E2E не пройден |
| 06 | Возобновляемый серверный черновик | в работе | Добавлены private catalog_builder_drafts, GET/PUT, revision CAS и сохранение/загрузка полей мастера. Реальная DB transaction проверила запись/повторное чтение, stale revision, невидимость чужому пользователю; UI E2E и история AI ещё не проверены |
| 07 | Товары и варианты | в работе | Существующий createProductAction/RPC, новый первый товар по4шагам. Browser LOCAL mock проверил все поля/фото, возврат, запрет преждевременного submit и сохранение ввода после ошибки. Authenticated DB/UI end-to-end не пройден |
| 08 | Баннеры, акции, дополнительные предложения | в работе | Кампании есть; нет правил совместимости/комплектов и общей приёмки |
| 09 | Доставка и настройки в конструкторе | в работе | Editor зон опубликован. Добавлены master toggle/min_order с allowlist полей и требованием активной зоны; 11 action tests. Нет полной интеграции шагов/сохранения UI E2E |
| 10 | Самовывоз, адрес/часы, карта/2ГИС/Яндекс | в работе | Форма, строгие URL, карта по нажатию, вывод в checkout; DB save/read/outsider и 10 новых тестов пройдены. Device handoff и полный UI/relogin не проверены |
| 11 | Самовывоз с предоплатой | в работе | Провайдер оплаты товаров не подтверждён. Polar SaaS subscription не равен оплате товара |
| 12 | Бронь, атомарный hold/expiry/cancel | в работе | ea0b670 опубликован. Пять миграций применены; rollback fixture проверяет replay, tenant isolation, резерв без обычного pickup, выдачу/оплату/возврат остатков ровно один раз, запрет oversell. Cron expiry succeeded; owner settings видны в production. Полный браузерный сценарий брони ещё не пройден |
| 13 | Заказ и неизменный snapshot условий | в работе | RPC сохраняет адрес/условия/зону в snapshot; DB тест запрета изменения прошёл. Полный RPC order и authenticated scenario ещё нужны |
| 14 | Общий renderer preview/published | в работе | StoreHome + storefrontStyle общие для главной и private /store-preview, мастер больше не показывает чужие демонстрационные товары. Browser equivalence/полный персональный дизайн не проверены |
| 15 | Azure модель/контекст/tools/E2E | в работе | Воспроизведён пустой content при исчерпании reasoning-лимита. reasoning_effort:none + json_object прошли живые текстовый (1.9с) и PNG (3.9с) тесты; лимит1600 не повышен. Полная цепочка browser message → confirmed saved shop change ещё не проверена; анализ файлов не поддержан этим тестом |
| 16 | Azure расходы и opt-out | проверен | Поздний GET 2026-09-08 вернул NoAutoUpgrade, Free Tier. Автоповышение отключено. Это не бесплатный inference и не денежный hard cap; лимиты запросов не увеличены |
| 17 | «Без разработчика» на главной | в работе | Не расширять обещание до неработающего конструктора |
| 18 | Мобильная адаптация, доступность | в работе | Старые responsive проверки не покрывают новые сценарии |
| 19 | Tenant security и полная приёмка | в работе | Узкие тесты/проверка RLS есть; 12-шаговый сценарий из задания отсутствует |
| 20 | Native notifications/order deep link | в работе | Исправлена и применена отсутствовавшая очередь/токены; order RPC transaction проверяет создание обезличенного уведомления. Worker проверяет ответ Expo/права. Добавлены ticket persistence, receipt polling, invalid-device disable и stale processing→unknown; SQL save/read/isolation и unit tests пройдены. CRON_SECRET/Vault настроены, Supabase minutely job активирован: signed endpoint200, anonymous401, cron succeeded. Постоянный ключ не попадает в net queue; только scoped90s HMAC. Native UUID deep link, RLS read и возврат после password login добавлены, mobile tsc/lint/iOS JS export пройдены. OAuth/device E2E и IPA ещё нет |
| 21 | Актуальность документации | в работе | Основные файлы уточнены; исторические документы не все сверены |
| 22 | Чистый вход и один активный шаг | в работе | Fresh production owner Studio открывает одну CTA. Имя→brief→цвета→3примера→получение→оплата/позже→проверка сохранены в черновике; атомарный commit настроек и AI-разделов проверен SQL. Локально brand upload доступен внутри цветов. Полный owner browser/save/relogin ещё не пройден |
| 23 | Три источника для каждой из6сфер | в работе | 18 ссылок в COMMERCE_REFERENCES_20260909.md; нужны PDP/checkout/mobile и UX-исследования |
| 24 | Три рабочих пути на сферу | в работе |18 отдельных маршрутных конфигураций на общем commerce engine, шесть разных editorial covers, sphere-specific grids/type/PDP и описания для AI.36 local purchase journeys390/1440, включая mobile filters, и36visual/overflow проверок пройдены. Новые композиции ещё локальные; полная owner AI→save проверка открыта |
| 25 | Kaspi fixed amount / собственный merchant / подтверждение | в работе | Официальный q2020: ручной ввод. Доступ web API для нашей модели не подтверждён; никакой оплаты/договора. Polar policy требует отдельного уточнения SaaS eligibility |
| 26 | Мобильные4пункта, без Обзора | в работе | Монохромные topbar/панель/Ещё, secondary links сохранены; regression test. Local config восстановлен, теперь требуется login, визуальная проверка не выполнена |
| 27 | Продажи по периодам / приватная историческая себестоимость | в работе | Опубликованы paid-only периоды1/7/30, UTC+5, keyset paging, private cost form и неизменный snapshot себестоимости/валовой прибыли. DB owner/outsider/snapshot regression повторно пройден10.09. Authenticated cost-form save/relogin ещё не проверен; не подменять это demo-продажами |

## Подтверждённая ошибка выполнения

Пропущено продолжение обязательного общего списка после локальных исправлений. Фактически были опубликованы обработка ошибок checkout и редактор зон; AI-диалог, бренд-материалы, настоящий preview и новая fulfilment-логика не реализованы. Ответы заканчивались перечислением внутренних следующих шагов без внешней причины остановки. В последних отчётах неполнота была признана — это не случай ложного утверждения о полностью готовом конструкторе, но это преждевременная сдача этапов вместо продолжения задания.

Дополнительно: PROJECT_STATE одновременно содержал «опубликовано» и «локально, не опубликовано» в текущей сводке. Это исправляется удалением противоречащих текущих утверждений, а не ещё одной надписью supersedes.

Исправление процесса: постоянное правило в AGENTS.md, единый список выше, доказательство на уровне требования. Исправление самого продукта ещё не завершено. Перед финалом сверять каждый ID; не отмечать проверенным без поведения, сохранения/reload и tenant negative test где применимо. Не считать размер работы внешним блокером.


# 2026-09-19 food/CRM follow-up acceptance

| Requirement | Status | Evidence / blocker |
|---|---|---|
| Food: delivery/pickup before menu | verified | Food gate implemented; focused 390px visual capture, all 36 390/1440 journeys, and production demo smoke pass |
| Order ASAP / requested time | verified | API + DB validation, rollback order creation, owner/buyer rendering, past-time negative test |
| Simpler AI builder | verified | Direct five-step flow and HoReCa presets; production save, logout, Google re-login, restored catalog and publish journey pass; unit render, TypeScript and build pass |
| CRM 70,000 KZT after connection | verified except financial settlement | State machine, exact amount and signed webhook verified; private one-time Polar product is exactly 70,000 KZT and `POLAR_CRM_SETUP_PRODUCT_ID` is active in Production. A real charge was not submitted because no CRM connection is verified and that would be a financial transaction |
| Staff invite/rights/change/revoke | verified | Production browser: invite accepted by verified existing account; initial four modules visible; changed to Orders only and reflected after account switch; revoked and employee then saw no active access. DB: inactive revision 3, no broad membership, invite/accept/two update audits |
| Builder save/re-entry/publish | verified | Production browser: five-step save, real product creation, logout, Google re-login, persisted catalog restore, explicit publish, and public `/s/dukenim-shop` verification. DB: ready/published, draft revision 5, one active product |
| Mobile and visual audit | verified | 18 configurations × 390/1440, no overflow; focused 390px fulfilment and checkout captures inspected |
| Release and production rendering | verified | `be8a35e`; Vercel `dpl_5Kjpax9je7xXXdxqeLwpcJ2QagxA` Ready/current; authenticated integrations and orders pages render |
| Food quick-menu and category-first templates | verified | Shared real storefront/cart; one-tap add for single variants; category-first path; production 390px checks, 427 tests, TypeScript and build pass; `e86511e` / `dpl_GrnzoScYwiNQEu4V2WE7ZAZ91ENV` Ready |
| Polar CRM product/configuration | verified | Private one-time `Подключение CRM — Старт`, exactly 70,000 KZT; production env set; `dpl_4Ej5nnic8VSK94pYvjWeSFbD1eMf` Ready. No payment submitted |
| Wraxa account/research | externally blocked | Real `Dukenim` account/project created; service requires payment before generation/editor. No paid step taken |

## Food stories template acceptance — 2026-09-19

| Requirement | Status | Evidence |
|---|---|---|
| Frito-style stories and menu composition | verified | Reference inspected; full-screen image stories/progress/pause/next/Escape, category sections and two-column cards; production browser 390/1440 |
| Functional menu, cart, delivery and timing | verified | Production search/add/cart passes both widths; existing delivery/pickup/scheduled checkout regression passes at 390 |
| Softer colours and mobile layout | verified | Purple/white theme; screenshots inspected and zero horizontal overflow at 390/1440 |
| Builder and saved-template integration | verified | Existing saved assortment key selects shared renderer; matching private-preview header and builder illustration; render tests and production build |
| Publish | verified | 9f6b337; Vercel dpl_BZWHfcL9Doh49NwewCG3UgSAWcEq Ready/current |
| Push source to GitHub | externally blocked | Three connection timeouts to github.com:443; local commit safe, direct deployment successful |

## Buyer history, food loyalty and configurable cart — 2026-09-19

| Requirement | Status | Evidence |
|---|---|---|
| Persistent history and verified account recovery | verified | Browser checkout, reload and fresh authenticated browser; SQL isolation/claim tests; permanent ownership also added for reservations |
| My orders + loyalty beside basket | verified | Shared header/hub; 390/1440 browser journeys and card screenshots |
| Flexible food loyalty + required builder step | verified | Owner authenticated mandatory-step save, product creation, reload/publish; six rule combinations in rollback SQL; settings mobile rendering |
| Earn/redeem/cancel/refund correctness and tenant isolation | verified | Actual browser paid+done → gift → redeem → cancel exact-milestone restoration; SQL refund/expiry/replay/referral/tenant tests |
| Visual references and mobile/desktop | verified | Official Starbucks/Dodo research; inspected menu, recipe modal, combo, cart and loyalty at 390/1440; no overflow |
| Quantity in catalog/cart | verified | +/- controls, edit/reload; unit aggregate stock/20-unit caps |
| Ingredient removals, paid additions, editable recipes | verified | Buyer checkout and kitchen show cucumber removal and cheese; DB ignores client prices; separate recipes persist |
| Real combos and structured owner editor | verified | Owner created real coffee+combo through UI; buyer ordered it; SQL stock/cancel/component/foreign-tenant checks |
| Release/canonical-domain smoke | verified | Source d874f0c; dpl_3KmhbgfdBsXgoNUFu9K1CrdaeBcp Ready/promoted; www.dukenim.kz 390/1440 configured cart, combo, edit/reload and card pass |
| Disposable acceptance data cleanup | verified | Isolated tenant/products/orders and two fixture auth users removed; real stores untouched |
| Source push | verified | d874f0c pushed to origin/main; previous network blocker resolved |

## Phone buyer, merchant SMS, gifts, raw materials and accent — 2026-09-20

| Requirement | Status | Evidence / blocker |
|---|---|---|
| Phone registration before real food order/reservation | verified in code and tests; external OTP blocked | Checkout/reservation require a Supabase user with `phone_confirmed_at`; APIs re-read the verified phone and reject unverified callers. Live code delivery needs an enabled Supabase SMS provider. |
| Permanent history and loyalty bound to buyer | verified | Order access attaches the auth user to the tenant customer and buyer member; fresh-browser history uses authenticated identity, while anonymous legacy receipts remain cookie-scoped. |
| Merchant SMS settings, consent and campaigns | verified except delivery | Owner settings, opt-in/out, approved Sender ID guard, tenant-scoped campaign queue, transactional order triggers and signed minutely worker are applied. Delivery needs `MOBIZON_API_KEY` and provider-approved Sender ID. |
| Automatic loyalty gifts | verified | Gift variant is selected in the loyalty builder; redemption adds a zero-price order item, decrements stock by movement and cancellation restores it. Rollback database regression passed. |
| Raw materials and recipes | verified | Structured material/recipe owner UI and movement-only stock are applied; order quantity consumes recipe amounts, removed ingredients are skipped and cancellation restores stock. Rollback database regression passed. |
| Food cart, customisation and combos | verified | Existing 390/1440 checks cover quantity, recipe edits, paid additions, real combo components, reload persistence and cancellation stock restoration. |
| Dark-blue accent and logo alignment | verified locally | Global tokens, home controls, store actions and logo mask/dot updated; 390/1440 home screenshots inspected with no horizontal overflow. |
| Mobile food journey | verified locally | 390px delivery gate → menu → add → persisted cart → checkout timing passes with no horizontal overflow. |
| Automated checks | verified | 442 tests pass, 4 live tests skipped; strict TypeScript and 77-page production build pass. |
| Production publish | verified | `062e845` plus cart-foreground fix `83a19ea` are on `origin/main`; `dpl_BEYespANwRba1SG8LV7iXEXdLsA8` is Ready/current. Fresh 390px production browser verifies phone screen, legal links, clear orders/cart controls, no overflow and unsigned SMS worker 401. |

## Guest ordering without SMS and storefront speed — 2026-09-21

| Requirement | Status | Evidence / blocker |
|---|---|---|
| Buyer → real order → owner | verified | Published isolated food store: 390px Edge buyer placed two cash/manual-Yandex orders; `/api/orders` returned 200, database saved contact/address/1,000 KZT goods-only total, authenticated owner `/admin/orders` showed both and manual courier instructions. Test tenant and its orders were deleted after restoring the owner's original store. |
| Browser guest history | verified | Order #2 appeared in `/s/.../orders` after checkout and again after page reload in the same browser. |
| Cross-device history/loyalty through Google account | in progress | Confirmed-email identity, signed receipt claim, account-linked order and tenant-scoped history are covered by automated tests; actual Google login on original device followed by a second-device browser check was not performed. Unverified phone alone cannot claim history. |
| Storefront and owner loading | verified for implementation; benchmark in progress | Store layout no longer fetches all products/variants for the header; food skips categories and other stores fetch category names only. Owner order queries run concurrently and avoid repeated scans. 461 tests, strict TypeScript and 78-route build passed; published `/s/dukenim-shop` returned 200 with zero page errors/overflow at 390/1440px and TTFB 268/267 ms, DOMContentLoaded 1,783/1,678 ms in headless Edge. No before/after or field benchmark was taken. |
| Full-screen courier notice on mobile | verified | At 390px cookie notice originally overlapped acknowledgement; z-index fix `c93d0a9` published, then acknowledgement, fulfillment choice and checkout completed in Edge. |
| SMS OTP and store-name sender | externally blocked | Owner deferred provider connection. No provider account/key/approved Sender ID or real OTP/message; no claim that SMS works. |
| Production release and cleanup | verified | `385de91` and `c93d0a9` pushed to main, Vercel Ready. Exact fixture tenant ID/slug deletion returned one row; follow-up counts: zero fixture tenants/orders, two existing stores retained. Azure unchanged. |
