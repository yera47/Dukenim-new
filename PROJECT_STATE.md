# Dukenim — current project state

Last reviewed: 2026-09-02

## Product

Dukenim is a multi-tenant commerce platform for small and growing retailers in Kazakhstan. A customer uses a branded catalog/storefront while the owner manages products, orders, stock, customers, and analytics from `/admin`. Platform administration lives at `/root`.

## Technical foundation

- Next.js 15, React 19, strict TypeScript.
- Supabase with tenant isolation through RLS.
- Roles: `owner`, `staff`, `superadmin`, verified server-side.
- Prices are integer KZT values.
- Stock changes must go through `stock_movements`.
- Public storefront route: `/s/[slug]`.
- Real payment provider is not connected; never imply successful real payment processing. Tariff selections may be captured as requests only until company requisites and a provider are connected.
- Public tariff source is now «Старт» 24 900 ₸/month or 239 000 ₸/year and «Бренд» 34 900 ₸/month or 335 000 ₸/year. The public selector is implemented locally; deployment still needs its normal release check.
- CRM integration requests are prepared in source only. Azure Foundry now has a server-only OpenAI-compatible client, a superadmin-protected test endpoint, and `/root/ai`; production model access remains disabled until a newly rotated key and the endpoint/deployment variables are stored in Vercel secrets.

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

## Brand source of truth

- Current brandbook: `output/pdf/Dukenim_Brandbook_2026.pdf` (version 1.0, August 2026).
- Current production masters: `public/brand/dukenim-flat-*`.
- Core colors: Black Jade `#071B17`, Aged Gold `#B08A50`, Pale Stone `#F4F0E8`, Graphite `#101713`, Warm Sand `#E8DFD0`.
- The threshold and wordmark dot are Aged Gold in the current approved system.
- Font: Manrope.
- Older green-accent `dukenim-approved-*`, `dukenim-logo-combo*`, and older PDFs are historical, not the current source of truth.
- The application UI still contains older green/orange and Nomad palette values; brand implementation is not yet fully unified.

## Marketing system

- Strategy, 30-day calendar, first-week scripts, and access plan exist under `marketing/`.
- Root marketing dashboard, trend ingestion endpoint, Supabase migration, Vercel cron, and GitHub Actions trigger exist locally.
- Migration `202608130001_marketing_engine.sql` has not been confirmed as applied to production.
- Instagram and TikTok publishing accounts are not connected through OAuth.
- No automatic publication or paid content generation is authorized without explicit approval of the material and cost.

## Delivery state

Catalog lifecycle is now represented on each tenant as `not_started`, `building`, or `ready`; the corresponding migration is applied to the connected production Supabase project. The dashboard routes owners to explicit catalog creation before product creation.

The workspace contains uncommitted product, brand, and marketing changes. Do not assume they are deployed merely because files exist locally. Verify Git, Vercel, Supabase, and domain state before making release claims.
