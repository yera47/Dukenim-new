# Mobile parity release 18 — acceptance checklist

Date: 2026-09-24

## Result

The native owner workspace now continues the same registration/catalog stage as the website and covers the daily merchant journey without treating the website as the default fallback. The interface uses white surfaces, Dukenim navy, compact headers, a glass primary navigation bar and dedicated editor screens with a top back button.

## Acceptance checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| Resume the same registration/catalog stage as web | verified | `workspaceRoute` uses persisted `onboarding_completed` and `catalog_status`; build 17 migration is active and build 18 preserves it. |
| Owner catalog, orders, inventory, customers and analytics | verified | Native routes read/write the same tenant-scoped Supabase records; strict TypeScript and iOS export pass. |
| Product creation with photos | verified locally | Native picker uploads up to five files to the existing tenant-scoped `product-images` bucket and passes their public URLs to the atomic product RPC; failed product creation removes newly uploaded files. |
| Food composition, weight and nutrition | verified locally | Native product creation calls `create_food_product` with ingredients and weight/KБЖУ in `food_options`. |
| Publish storefront from app | verified locally | Catalog calls the existing guarded `publish_catalog` RPC and shows prerequisite errors. |
| Stories with photo/video, product link and publication | verified locally | New native editor uses the existing `food-stories` Storage bucket and tenant RLS; it supports draft/published state and deletion. |
| Campaigns | verified locally | New native campaign editor creates drafts and publishes, unpublishes and archives in `storefront_campaigns`. |
| Loyalty and referral rule | verified locally | New native editor reads program/rules and saves through the validated `save_loyalty_program` RPC. |
| Store theme and hero copy | verified locally | New native editor writes the shared `tenant_storefront_settings` row. |
| Yandex/manual Kaspi/pickup | verified by source and prior build | Native delivery editor uses the same `tenant_settings` and Yandex delivery zone, with no invented courier price or automatic payment confirmation. |
| Store link and buyer preview | verified locally | Native screen opens and shares the permanent `/s/{slug}` address. |
| Support chat and read receipts | verified locally | Native general chat uses tenant RLS, Realtime updates and `mark_general_support_read`. |
| Staff invitations and permissions | verified in build 17 | Native owner team screen creates/copies links, edits access, disables/restores and removes through the hardened API. |
| Staff AI Studio | verified locally | New bearer endpoint re-checks active staff membership and `studio:write` before credit reservation and again before save; five focused owner/staff API tests pass. |
| Raw food materials | verified locally | Native material editor reads tenant materials and saves through `owner_save_food_material`, preserving movement-led stock changes. |
| Multi-store selection | verified locally | Owner can switch the selected store in native management; following screens read that persisted selection. |
| Dependency/config health | verified | Expo Doctor 21/21, mobile TypeScript, root TypeScript, targeted tests, 82-route production build and clean iOS export pass. |
| Physical iPhone scenarios | externally blocked | Requires installing build 18 from TestFlight and using real camera/media permissions, push delivery and two accounts. |
| Automatic card/Kaspi settlement, refund and live CRM | externally blocked | Provider merchant credentials/contracts and real settlement webhooks do not exist in the project. |
| SMS | externally blocked/deferred | Owner explicitly deferred SMS provider onboarding and Sender ID. |
| Complete native superadmin console | not started | The iOS app is an owner/staff workspace; platform-wide destructive and finance controls remain on the protected web root console. |
| Advanced food add-on/combo editor and recipe mapping | in progress | New item creation includes images, ingredients and nutrition; existing products still use web for arbitrary add-on/combo groups and recipe-to-material mapping. |

## Checks

- `apps/mobile: npx tsc --noEmit`
- `apps/mobile: npx expo-doctor` — 21/21
- `apps/mobile: npx expo export --platform ios --output-dir ../../output/mobile-native-owner-export-build18 --clear`
- `npm test -- src/app/api/mobile/staff-studio/route.test.ts src/app/api/staff/studio/route.test.ts` — 5/5
- `npx tsc --noEmit`
- `npm run build` — 82 routes

## Release boundary

A successful archive and TestFlight upload verifies compilation and signing, not camera/media permission, APNs delivery, staff two-account access or payment receipt handling on a physical phone. Those remain separate acceptance steps.
