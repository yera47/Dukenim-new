# Dukenim Design System

## Current direction — 2026-09-08

Platform: restrained monochrome, readable typography and progressive disclosure. Official D geometry, grey lower threshold and wordmark dot; see docs/BRAND_CURRENT.md. No new room/monolith/gold design. Phone/CRM media explain real operations. Tenant storefronts use their own identity, not forced platform monochrome. AI-led setup starts with business needs, not mandatory fixed palettes. Design is a target until rendered and verified in source/device QA.

## Historical design specification — superseded

The following cinematic/gold direction is retained only for asset provenance. Do not implement it as the current design system.

## Direction

Dukenim выглядит как кинематографичный, но рабочий коммерческий продукт — не шаблонный SaaS и не декоративный лендинг. Основная метафора — **Kinetic Atelier Ledger**: монолитная сцена продаж с ясным операционным слоем, где витрина, заказ и CRM — части одного маршрута.

## Visual language

- Black Jade `#071B17` — крупные рабочие и киношные поверхности.
- Aged Gold `#B08A50` — единственный акцент: переход, выбранный тариф, CTA, ключевой статус.
- Pale Stone `#F4F0E8` — светлая операционная поверхность.
- Graphite `#101713` и Warm Sand `#E8DFD0` — иерархия текста и разделителей.
- Радиусы сдержанные: 10px у контролов, 14px у рабочих панелей. Пилюли — только статусы.
- Тени используются только как высота поверхности; внутри плотных блоков структуру создают разделители.

## Typography

Manrope покрывает кириллицу и остаётся ясным в интерфейсе. Заголовки плотные и тяжёлые, но tracking не ниже `-0.04em`. Цифры используют tabular figures. Служебные подписи короткие, прописные, с увеличенным трекингом.

## Components

- Primary button: Black Jade / Aged Gold — ровно одно главное действие на контекст.
- CTA button: Aged Gold — только переход к следующему коммерческому шагу.
- Secondary button: светлая поверхность с видимой границей.
- Status badge: компактная пилюля, никогда не используется как обычный контейнер.
- Data panel: один смысловой блок, без вложенных декоративных карточек.
- Table/list: фиксированный порядок колонок, заметные заголовки, tabular numbers, строка сохраняет идентичность при изменении статуса.

## Responsive behavior

На телефоне колонки переходят в вертикальный поток по приоритету. Рабочая навигация владельца превращается в нижнюю панель из пяти частых действий. Таблицы сохраняют горизонтальный скролл вместо разрушения колонок. Primary action остаётся доступным в первом экране.

## Motion and states

Motion короткий и физичный: панели продукта, корзины и CRM могут двигаться как один путь покупки; кнопка поднимается на hover и сжимается на active. Higgsfield-фильм — необязательный слой за интерфейсом: при его отсутствии встроенная сцена остаётся полноценной. `prefers-reduced-motion` отключает переходы. Фокус всегда видим. Disabled, loading, error и empty состояния должны называться прямо и подсказывать следующий шаг.
