# Dukenim — current project state

Last reviewed: 2026-09-07

Serik presentation release 55a6f37: dpl_GXd7mTehtyNnr7gLpo5PUYB7pGqR Ready/aliased. Demo names and person/business placeholders now Серик / Серик Шоп. Fresh phone and CRM recordings with new URLs; Brand card has restrained neon emphasis, pricing unchanged. Presentation smoke passes on canonical domain at 390/1440; both WebM assets serve successfully. 64 tests, tsc/build pass. Real first-run persistence E2E still requires isolated authenticated test account; existing owner store was not reset or renamed.

Catalog wizard release 38324c0: dpl_4zrrBjQq8TvNLt4YqKmAuNkCV14c READY and canonical aliases confirmed. First-run design step offers validated AI template/palette recommendations; competing separate composer removed. tsc, 64 tests and production build pass. Anonymous AI Studio redirects to login. Authenticated first-run generation/save E2E remains unverified. Detailed audit and execution prompt: docs/CATALOG_CREATION_AUDIT.md.

Media release confirmed: dpl_9fjZ6JaNRy1NG2VkpXxNZ4Axrksx READY, www.dukenim.kz and apex aliased. All seven niche media smoke checks passed on production at 390/1440; mask PNG returns 200. Source 62b9c10. This supersedes the in-progress media note below.

Media continuation source 62b9c10: every demo offering has an image; beauty/food five positions, other non-fashion demos four each. Generated 25 niche illustrations and one corrected featureless-mask still. No new video is complete. Higgsfield balance verified 5 credits, no top-up. Browser media/loading/overflow checks passed for all seven niches at 390 and 1440; tsc and 59 tests pass. Final Vercel release is being checked before reporting publication.

Latest demo release: dce2749; Vercel dpl_FrkMhX1eK2kFGpNVva5oJoi2JddJ reached READY and alias www.dukenim.kz. `/demo` offers eight business examples; fashion has ten products, black/white styling, separate catalog/category routes and return to Studio. Tests: 58 passing, tsc/build passing; local mobile/desktop navigation passed. Outstanding work is explicitly tracked in docs/REQUEST_AUDIT_20260907.md, including unfinished promo video and conversational builder.

## Update — 2026-09-07

- AI Studio can now produce a structured storefront-design proposal (tariff-allowed layout, curated palette and hero copy) and apply it only after the owner presses an explicit button. The apply route uses the signed-in Supabase session, RLS and tenant/intent filters, preserves the owner's existing image and brand colour, and rechecks plan access. Production migration `20260907110158_ai_store_design_intent.sql` is applied and verified. Release `bf65916` is deployed as Vercel `dpl_5aCPC5YChSoDxXFkRe5qgkTBM8SW` and aliased to `www.dukenim.kz`; 50 tests and the 58-route build pass.
- AI-generated hero copy can now be applied explicitly while preserving the current template, palette, image and brand colour. On «Бренд», generated promotion copy can be saved as an idempotent unpublished campaign draft. Release `81d06eb` is deployed as Vercel `dpl_5AHSM3XKDY8ZV1CqqoqM65hHQuHe`; 55 tests and the 59-route build pass.

- Release 95b38d1 is Ready on canonical domains; authenticated production UI check confirms new AI Studio. This verifies deployment/UI, not the full new-store write journey.

- AI-first first-run workflow is implemented in source: Studio available before first product, embedded catalog/product editors, real explicit saving of generated category names, mobile-primary AI navigation, and a domain help page. TypeScript, 45 tests and production build passed; production authenticated E2E remains required.
- Root plan/status mutation now validates input, records intent before mutation and updates both fields together. Full root catalog CRUD is still incomplete.
- The previous d49ea5e release is verified Ready on both canonical domains. The four Polar tariff checkout creations were verified in its release preparation; real settlement/payout is not verified. Higgsfield production is pending a spending ceiling, not completed.

## Update — 2026-09-06 (release not confirmed)

- Local homepage now uses the owner's monochrome direction. Full cabinet/mobile redesign remains incomplete; old gold/room website branding below is historical.
- Checkout v2, support context, onboarding preferences and AI campaign linking are implemented locally; six targeted 20260905 migrations were applied this session. Legacy anonymous order RPC was restricted. Matching source deployment/smoke remains a priority.
- Polar Dukenim products and production webhook exist; Vercel IDs/secret were changed. Access-token organization, old subscriptions and checkout remain unverified: migration is NOT complete. Backup, legal and native release gates remain open.
- The local public product story now has a reduced-motion-safe interactive transition from storefront phone to order to CRM (`CommerceMotion`). The official D symbol is reused as a monochrome mark in homepage/auth/admin surfaces. `/root/diagnostics` is a read-only superadmin health/audit page; root mutations reject local demo sessions.

## Product

Dukenim is a multi-tenant commerce platform for small and growing retailers in Kazakhstan. A customer uses a branded catalog/storefront while the owner manages products, orders, stock, customers, and analytics from `/admin`. Platform administration lives at `/root`.

## Technical foundation

- Next.js 15, React 19, strict TypeScript.
- Supabase with tenant isolation through RLS.
- Roles: `owner`, `staff`, `superadmin`, verified server-side.
- Prices are integer KZT values.
- Stock changes must go through `stock_movements`.
- Public storefront route: `/s/[slug]`.
- Polar checkout, signed subscription webhook and customer portal are implemented and production-configured with four KZT products in the legacy `dukenimkz` organization. The intended primary `Dukenim` organization now has its first approved monthly Start product (24 900 ₸); it is not wired into production checkout until all products, webhook and server credentials are migrated and tested together. The integration fails closed when configuration is incomplete and applies signed deliveries atomically. Polar payout/business onboarding still requires the owner's legal and bank details, so successful settlement must not be claimed yet.
- Google sign-in is live: the Google Cloud OAuth client has one fresh persistent secret stored only in Supabase Auth, the audience is in production, and a full production E2E completed from `/login` through Google consent to both `/root` and `/admin`. The old Google secret was disabled and permanently deleted in Google Cloud on 2026-09-04. Apple Developer membership, the Dukenim App ID and web Service ID are active and configured for the Supabase callback; Apple login remains disabled in production until the downloaded private key is securely supplied to Supabase/Vercel and the live E2E succeeds.
- Trial entitlement is enforced server-side: every trial has an explicit seven-day end, paid-tier actions use the effective `next_plan` during that window, public storefront RLS and server lookup reject expired trials, and AI API access uses the same entitlement decision.
- Public tariff source is now «Старт» 24 900 ₸/month or 239 000 ₸/year and «Бренд» 34 900 ₸/month or 335 000 ₸/year. The public selector is implemented locally; deployment still needs its normal release check.
- CRM integration requests are prepared in source only. Azure Foundry is live in production through the server-only OpenAI-compatible client and the `Kimi-K2.6` deployment. The rotated key and endpoint/deployment configuration are stored only in Vercel Production; `/root/ai` and the tenant `/admin/ai-studio` generation flow were both verified end to end on 2026-09-03.

## Resilience infrastructure

- A private Backblaze B2 bucket for production backups exists with server-side encryption enabled; it is empty until a least-privilege application key and backup jobs are configured.
- Cloudflare Free zone onboarding for `dukenim.kz` is prepared with Vercel apex/`www` and mail DNS records. Public authoritative DNS remains at Hoster.kz until the registrar nameserver switch is completed and verified.
- GitLab is intended as a private source mirror; the mirror repository and first push are not yet complete.

## Product readiness

- Storefront, cart, checkout flow, owner dashboard, plans, onboarding, and root dashboard exist.
- Production Supabase now contains the application RPCs for onboarding, product creation, storefront orders, offline sales, and subscription activation. Checkout uses the database `courier`/`pickup` delivery values; real online payment remains intentionally unavailable until a provider is connected.
- Seven-day trial flow exists and does not require a bank card.
- Demonstration data exists; confirmed customer testimonials and commercial performance metrics do not.
- Legal templates (offer, privacy and cookies) exist but require real company details and legal review before commercial launch.
- Production has RLS-protected tables for promotion codes, tariff checkout requests, promotion redemptions, and root audit events. The public guest checkout RPC is still legacy-exposed until the server-side replacement is deployed and smoke-tested; its lockdown migration must not be applied earlier.
- `/admin/ai-studio` and `/admin/requests` (tenant-scoped `change_requests`/`messages`, already RLS-protected, with a root queue at `/root`) now cross-link each other as an explicit "ИИ-помощник / написать в поддержку" choice; no new ticket schema was needed.
- Storefronts have PWA manifests and a narrow service-worker shell that caches public static assets only. Admin, root, auth and API routes remain network-only to avoid retaining tenant or session data in browser storage. A native Expo iOS/Android client now exists under `apps/mobile`: it uses the approved Dukenim identity, shares public Supabase Auth configuration, recognizes owner/superadmin profile roles, requests notification permission, and has camera barcode scanning. The source now includes RLS-isolated device-token and order-notification-outbox migrations, native token registration gated by EAS configuration, and a CRON_SECRET-protected Expo delivery handler with retry limits. An iOS app record is now created in App Store Connect and linked to `kz.dukenim.app`; it is not yet an App Store/TestFlight release because no signed build has been uploaded. Neither mobile migration nor scheduled delivery is enabled in production, and iOS widgets and native social OAuth remain separate completion steps.
- Audit finding (2026-09-03): the historical local migration chain cannot be replayed cleanly because older 12-digit files reference types whose creation is not represented. Production was verified directly and contains the authoritative enum values. No ineffective late "fix" migration is retained; baseline/reconcile the old history before any blanket database push.

## Brand source of truth

- Current brandbook: `output/pdf/Dukenim_Brandbook_2026.pdf` (version 1.0, August 2026).
- Current production masters: `public/brand/dukenim-flat-*`.
- Core colors: Black Jade `#071B17`, Aged Gold `#B08A50`, Pale Stone `#F4F0E8`, Graphite `#101713`, Warm Sand `#E8DFD0`.
- The threshold and wordmark dot are Aged Gold in the current approved system.
- Font: Manrope.
- Older green-accent `dukenim-approved-*`, `dukenim-logo-combo*`, and older PDFs are historical, not the current source of truth.
- The shared application tokens and owner navigation now use the approved Black Jade/Aged Gold/Pale Stone system. Some feature-specific legacy CSS remains and should be removed incrementally when those screens are touched.

## Marketing system

- Strategy, 30-day calendar, first-week scripts, and access plan exist under `marketing/`.
- Root marketing dashboard, trend ingestion endpoint, Supabase migration, Vercel cron, and GitHub Actions trigger exist locally.
- Migration `202608130001_marketing_engine.sql` has not been confirmed as applied to production.
- Instagram and TikTok publishing accounts are not connected through OAuth.
- No automatic publication or paid content generation is authorized without explicit approval of the material and cost.

## Delivery state

Catalog lifecycle is now represented on each tenant as `not_started`, `building`, or `ready`; the corresponding migration is applied to the connected production Supabase project. The dashboard routes owners to explicit catalog creation before product creation.

Production release `c0b7753` is Ready on Vercel and aliased to `dukenim.kz`/`www.dukenim.kz`. Google OAuth and authenticated owner/root access are verified. The responsive admin navigation is verified at desktop and 390×844 mobile viewports, including the complete «Ещё» menu. Azure `Kimi-K2.6` passes the superadmin diagnostic and produces a schema-valid tenant AI Studio draft in production.

Production release `2e3066f` extends the monochrome public homepage with an inspected Higgsfield promo film and interactive niche storefront examples. The same niche-preset engine powers the live catalog preview inside AI Studio/catalog setup. Generated goods are explicitly labeled as demonstrations. Vercel deployment `dpl_7bQm9EK7A1z6wP5VsX8bGShedieZ` is Ready and aliased to `www.dukenim.kz`; TypeScript, 45 tests, the 56-route build and production smoke pass.
Production Supabase now enforces category/tenant ownership inside `create_product_with_variants`; migration `20260907073737_enforce_product_category_tenant.sql` is applied and verified.
Production commits `9048fc3` and `72b3847` add `/root/stores/[id]`: audited superadmin product corrections and reversible visibility controls, plus store-scoped orders/categories/audit context. It does not expose permanent deletion, credential access, arbitrary SQL or direct stock mutation. Vercel deployment `dpl_DjwNMU3yNgmQTPEqQYYYRLaTC1p5` is Ready and aliased; authenticated production visual QA passed. TypeScript, 47 tests and the 56-route build pass.
Production commits `9200072` and `61d5640` align saved storefront templates with public rendering, add vertical-specific setup language, restore the public `/s/demo-shop` route under production Supabase, and place exact Dukenim phone/owner recordings on the homepage. Demo checkout is explicitly non-persistent. Vercel deployment `dpl_D4RUetx1BczS37mPFUiYbEr7CRiM` is Ready and aliased to `dukenim.kz`/`www.dukenim.kz`; smoke checks pass for homepage, demo catalog/product/checkout, AI Studio redirect and both media assets. TypeScript, 46 tests and the 57-route build pass.
Design references (local, 2026-09-04): hero now uses `public/design/dukenim-home-hero-reference-v6.png` with separate catalog, CRM and phone objects in one warm room. Blocks 02 and 03 were regenerated to continue the same room and palette; no deployment yet.
