# Dukenim native workspace — release checklist

Date: 2026-09-24

## Result

The iOS owner shell was replaced by a native working application. Authentication, registration, first-store creation, AI Studio, Catalog, product creation/editing, Orders, order/payment status, Stock, Customers, Team, Analytics, Scanner, Delivery/Kaspi setup, storefront preview, push settings and sign-out now have native routes backed by the same production Supabase project as `dukenim.kz`. The persistent bottom navigation contains AI Studio, Catalog, Orders and More.

## Implemented and verified

- Native navigation: every internal route referenced by a mobile button has a matching Expo Router screen. Legal documents and support intentionally open the public web pages.
- Shared state: owner screens read and mutate the existing tenant-scoped tables/RPCs; stock changes use `set_variant_stock` and therefore keep `stock_movements` as the source of truth.
- Native registration: explicit consent, confirmed email, business sector and transactional first-store RPC. A rollback-only production probe verified tenant, owner membership, settings and storefront creation.
- AI Studio: bearer-authenticated mobile endpoint restores the store conversation, enforces entitlement/daily/credit limits and stores responses.
- Team: native invitation/share flow, access editing, suspend/restore, invitation revoke and employee removal use the hardened staff RPCs.
- Staff login: accounts with active employee access now enter a scoped native employee workspace instead of store creation. Orders and permitted module summaries use the same staff RPCs as the web cabinet.
- Kaspi/Yandex: settings state that Dukenim does not confirm settlement or quote courier price. The merchant verifies the Kaspi transfer and orders Yandex door-to-door after agreeing the price.
- Identity: approved D geometry is unchanged; the canvas is white, the body is black and only the inner door threshold uses medium navy `#315F78`.
- Checks: mobile strict TypeScript, Expo lint, Expo Doctor 21/21 and final iOS Metro export pass. Root strict TypeScript passes. The earlier full suite has 488 passing tests with four live-AI tests intentionally skipped, and the production Next build passes with both mobile API routes.

## Azure

No Azure resource, model deployment, key, quota or billing setting was changed. AI Studio continues through the existing configured service.

## Not completed

- A physical-device acceptance run is still required after TestFlight processing for camera, APNs, widget, deep links and real account workflows.
- Staff AI Studio design application, story media upload, campaign editing, loyalty-rule editing and superadmin management remain web-only. They are not silently redirected from the owner module grid.
- Real Kaspi settlement remains manual and cannot be automatically verified without a provider integration. SMS remains deferred.

## Required owner action

Install the new TestFlight build when Apple finishes processing. Sign in with the same account as the website and run one owner order plus one employee invitation on the iPhone.

## Where to verify

- Native: login → registration/setup → AI Studio/Catalog/Orders/More.
- Production: `https://www.dukenim.kz` and the mobile endpoints `/api/mobile/ai-studio`, `/api/mobile/team`.
- Database: migration `20260924074517_mobile_native_workspace.sql` in Supabase project `gklgbesydbottkqilihb`.
