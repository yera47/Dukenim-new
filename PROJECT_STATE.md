# Dukenim — current project state

Last reviewed: 2026-09-04

## Product

Dukenim is a multi-tenant commerce platform for small and growing retailers in Kazakhstan. A customer uses a branded catalog/storefront while the owner manages products, orders, stock, customers, and analytics from `/admin`. Platform administration lives at `/root`.

## Technical foundation

- Next.js 15, React 19, strict TypeScript.
- Supabase with tenant isolation through RLS.
- Roles: `owner`, `staff`, `superadmin`, verified server-side.
- Prices are integer KZT values.
- Stock changes must go through `stock_movements`.
- Public storefront route: `/s/[slug]`.
- Polar checkout, signed subscription webhook and customer portal are implemented and production-configured with four KZT products. The integration fails closed when configuration is incomplete and applies signed deliveries atomically. Polar payout/business onboarding still requires the owner's legal and bank details, so successful settlement must not be claimed yet.
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
- Storefronts have PWA manifests and a narrow service-worker shell that caches public static assets only. Admin, root, auth and API routes remain network-only to avoid retaining tenant or session data in browser storage. A native Expo iOS/Android client now exists under `apps/mobile`: it uses the approved Dukenim identity, shares public Supabase Auth configuration, recognizes owner/superadmin profile roles, requests notification permission, and has camera barcode scanning. The source now includes an RLS-isolated `mobile_device_tokens` migration and native token registration gated by EAS configuration. It is source-verified but is not yet an App Store/TestFlight release; the migration is not applied to production, and APNs delivery/outbox, iOS widgets and native social OAuth remain separate completion steps.
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
