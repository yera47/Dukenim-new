# Dukenim — единый тариф и соответствие приложения сайту

Дата проверки: 2026-09-24

Статусы: **verified** — проверено кодом и подходящей автоматической/визуальной проверкой; **in progress** — реализовано, но требуется новый подписанный релиз или авторизованный сценарий; **externally blocked** — нужен внешний провайдер, учётная запись магазина или физический iPhone.

## Требования владельца

| Требование | Статус | Доказательство |
| --- | --- | --- |
| Один тариф «Каталог», 24 900 ₸/месяц | verified | Единая модель в `src/lib/plans.ts`, маркетинговый тариф, web/mobile onboarding, страницы тарифа и structured data; годовой переключатель и публичные карточки старых тарифов удалены. |
| Все функции доступны на одном тарифе | verified | Ранги планов выровнены; middleware и UI-блокировки сняты; Studio, кампании, цвета, шаблоны и CRM-заявки больше не зависят от старого значения плана. Production RPC `create_catalog_atomic` обновлён и разрешает все шесть шаблонов при активной подписке/пробном периоде. |
| Категория бизнеса не выбрана заранее | verified | Web и mobile onboarding начинают с пустого выбора; «Еда и напитки» становится активной только после нажатия владельца. |
| Регистрация и продолжение незаконченной настройки | verified | Мобильная регистрация визуально проверена при 390×844; `workspaceRoute` и общий Supabase tenant/onboarding state направляют владельца на сохранённый этап. |
| Стрелка назад без текста | verified | Редакторские экраны используют общий `EditorScreen`; onboarding, каталог, товары, заказы, сканер и AI Studio получили компактную кнопку-стрелку. |
| AI Studio: поле выше навигации, отправка вправо, постоянная подсказка | verified | Composer поднят над safe area; кнопка `➜`; карточка следующего шага показывает товары, публикацию и заказы за сегодня и ведёт к нужному действию. |
| Плавная нижняя навигация в стиле Liquid Glass | verified | Общий `AppShell` использует `GlassView`, прозрачную заливку, мягкую рамку, safe area и четыре постоянных раздела. iOS export проходит. |
| Наглядная сборка витрины | verified | В приложение добавлен центр сборки магазина и визуальные карточки шаблонов, затем нативные переходы к товарам, оформлению, доставке/оплате, историям, акциям, лояльности и предпросмотру. |
| Интеграции в приложении | verified | Нативный раздел создаёт tenant-scoped заявки Poster/iiko/МойСклад/CRM и показывает общий с web статус. Пароли не собираются. Kaspi и Яндекс остаются в доставке/оплате. |
| Сайт и приложение используют одни данные | verified | Все owner-экраны работают с теми же tenant tables/RPC/storage в Supabase; RLS и owner/staff access остаются общими. |
| Новый TestFlight-релиз | in progress | Локальный iOS export завершён; требуется подписанная EAS-сборка и обработка App Store Connect. |

## Карта функций сайта и приложения

| Функция владельца | Сайт | Приложение | Состояние |
| --- | --- | --- | --- |
| Регистрация, вход, восстановление | `/register`, `/login` | `/register`, `/`, `/forgot-password` | verified |
| Создание магазина и продолжение onboarding | `/onboarding`, `/stores` | `/onboarding`, `/setup-store` | verified |
| AI Studio | `/admin/ai-studio` | `/studio`, `/staff-studio` | verified |
| Товары, варианты, фото, остатки | `/admin/catalog` | `/catalog`, `/product-new`, `/product-edit` | verified |
| Сборка/публикация витрины | catalog builder/settings | `/catalog-builder`, `/store-builder`, `/brand` | verified |
| Заказы и ручное подтверждение Kaspi | `/admin/orders` | `/orders`, `/order` | verified |
| Склад и сырьё | `/admin/stock` | `/stock`, `/materials` | verified |
| Клиенты | `/admin/customers` | `/customers` | verified |
| Аналитика | `/admin/analytics` | `/analytics` | verified |
| Сотрудники, ссылки и права | `/admin/team` | `/team`, `/staff` | verified in code; two-account production journey remains externally blocked pending release |
| Доставка, самовывоз, Kaspi, Яндекс, 2GIS | settings/onboarding | `/delivery` | verified |
| Истории | catalog stories | `/stories` | verified |
| Акции и баннеры | catalog campaigns | `/campaigns` | verified |
| Лояльность | settings/catalog | `/loyalty` | verified |
| CRM/POS/учётные интеграции | `/admin/integrations` | `/integrations` | verified for request/status workflow; live provider sync externally blocked |
| Штрихкод | catalog/stock | `/scanner` | verified in code; camera acceptance externally blocked pending physical iPhone |
| Ссылка, предпросмотр и свой домен | `/admin/domains` | `/store-link`, `/preview`, support | verified; DNS remains support-assisted on both surfaces |
| Тариф | `/admin/plan` | `/plan` | verified; live provider checkout still needs production transaction acceptance |
| Поддержка | `/admin/requests` | `/support` | verified |
| Push и виджет заказов | browser settings | `/settings`, iOS widget | in progress; implementation/export pass, physical-device delivery remains externally blocked |
| Platform superadmin | `/root` | intentionally absent | verified product boundary: this is Ersat's platform console, not a merchant-app function |

## Оставшиеся внешние границы

- Реальная подписка Polar и webhook должны быть проведены настоящим способом оплаты; сборка не доказывает списание денег.
- Poster, iiko, МойСклад и CRM не считаются подключёнными без credentials/OAuth и согласного пилотного магазина.
- Push, камера, виджет, производительность и полный свежий onboarding требуют нового TestFlight build на физическом iPhone.
- SMS остаётся отложенным по решению владельца.
- Автоматическая DNS-проверка своего домена отсутствует и на сайте, и в приложении; сейчас это общий support-assisted процесс.
