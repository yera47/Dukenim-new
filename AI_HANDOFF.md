# Dukenim — AI handoff

Updated: 2026-09-02 by Codex

## Latest outcome

P0/P1 implementation pass — 2026-09-02:

- Rebuilt the public and operating colour system around the current approved Black Jade `#071B17`, Aged Gold `#B08A50`, Pale Stone `#F4F0E8`, Graphite and Warm Sand masters. The landing hero now uses the confirmed sales hierarchy: «Dukenim — продажи 24/7» → «Одна ссылка вместо сотни сообщений». It uses the approved flat reversed wordmark rather than the historical master.
- Added `/admin/ai-studio` and a constrained server API. The owner can select only three bounded draft intents: storefront hero, promotion, or catalogue copy. The model receives a narrow system contract, output must pass strict JSON/length validation, requests are tenant- and platform-rate-limited, and every result is intended for review. It cannot be used as a general chat, change platform code, or publish a storefront/campaign automatically. Source migration `20260902125759_ai_studio_governance.sql` adds the auditable generation log; it is not applied yet.
- Added a safe Higgsfield film slot to the hero. `NEXT_PUBLIC_HIGGSFIELD_HERO_VIDEO` is intentionally blank until an owner-exported MP4 is supplied. The built-in animated CRM/product/phone composition remains the visual fallback, so a missing film cannot produce an empty hero.
- Extended `.env.example` with the exact server-only Azure, Polar product/webhook, Higgsfield video, and OAuth enablement variables. This is configuration preparation, not activation.
- Supabase CLI has no authenticated access token in this environment, so CRM and AI Studio migrations were not applied. Polar product IDs, access token, webhook secret, business review and Google/Apple provider credentials are also absent from the runtime; no payment or social sign-in was claimed as live.
- `npx tsc --noEmit` passed. A clean `npm run build` passed after the disposable `.next` cache was rebuilt; `BUILD_ID=RdAxMM34dPUvqTKGlB5lu`. Local production smoke test: `/` and `/admin/ai-studio` returned HTTP 200 at `http://localhost:3014`.
- A production deploy was attempted to the locally linked Vercel project `dukenim-new`; the CLI upload began after sandbox permissions were restored, but did not return a deployment URL in this session. Do not claim `dukenim.kz` was updated. Verify project membership and retry the deploy before changing DNS.

Next recommended action: authenticate Supabase CLI or link the production project, apply and smoke-test `202609020001_crm_integration_requests.sql` plus `20260902125759_ai_studio_governance.sql`; then add Azure/Polar/OAuth secrets only through Vercel/Supabase secret settings and create the corresponding verified provider configurations. Export the approved Higgsfield MP4 and set the public video URL only after its final visual review.

## Prior local readiness audit

Local readiness audit — 2026-09-02:

- Rebuilt the local `.next` artifact without running a production build alongside the development server. Running both against the same Next.js cache had produced missing-manifest errors locally; the cache was regenerated, then the application was started with `next start --port 3013`.
- Local production smoke check returned HTTP 200 for `/`; the current local URL is `http://localhost:3013`.
- Verified current implementation boundaries: the public tariff selector, annual/monthly prices, promotion-request flow, catalog-first route guard, catalog template/palette setup, CRM request/queue UI, Azure Foundry server wrapper, and Google/Apple entry UI exist in source. `@polar-sh/nextjs` is installed but has no application import or checkout/webhook implementation; `src/lib/payment.ts` remains an explicit unavailable-provider stub. Do not call Polar payment live.
- CRM integration migration `202609020001_crm_integration_requests.sql` remains unapplied to production. Azure has no live Foundry configuration. Google/Apple sign-in remains an honest disabled/pending provider path until Supabase OAuth and Apple membership provisioning are complete.

Checks: `npx tsc --noEmit` completed before the clean production build; `npm run build` produced `BUILD_ID=ppsjOnCTo-RpIZVeca7v9`; local production root request returned HTTP 200.

Next recommended action: implement and test Polar checkout and signed webhook handling only after Polar business review, products, access token and webhook secret are available; apply and smoke-test the CRM migration before presenting CRM requests to customers; then perform a single full responsive visual pass of the landing and onboarding flows.

Apple Sign In provisioning check — 2026-09-02:

- The Apple Developer account is authenticated, but its membership is visibly `Pending`. Apple’s account page says the membership purchase may take up to 48 hours to process. The Certificates, Identifiers & Profiles capabilities needed to create the Service ID and private OAuth key are therefore not yet available.
- Do not claim Apple Sign In is connected and do not attempt workaround key creation. When Apple activates the membership, create a Services ID and Sign in with Apple key, store the private key only in Supabase/Vercel server configuration, then enable the existing application-side provider skeleton.

JANYM_DA purchase-flow reference — 2026-09-02:

- The initially created full catalog demo was removed after the owner clarified the deliverable: the client needs a visual explanation of the Dukenim purchase journey, not a separate catalog implementation.
- Built `/demo/purchase-flow`: three presentation-ready blocks for the marketing site/client reference — buyer selects a size in a phone catalog, buyer chooses delivery/pickup and real payment-on-receipt options, then the owner sees the new order in the Dukenim application. The layout uses real interface text so it remains legible rather than relying on generated UI text.
- Created three 2K product visuals with Higgsfield Nano Banana Pro from the supplied JANYM_DA visual mood (muted olive, warm oak, calm modest fashion). No supplied person, Instagram identity, or logo was copied into generated imagery. Three calls used 6 Higgsfield credits.
- Local browser preview verified with HTTP 200 after rebuilding the disposable Next cache. Screenshot: `output/janym-da-purchase-flow-reference.png`; the preview tab is marked as a deliverable. `npx tsc --noEmit` passed.

Changed files: `src/app/demo/purchase-flow/page.tsx`, `src/components/demo/purchase-flow-preview.tsx`, `src/components/demo/purchase-flow-preview.module.css`.

Boundary: this is a local presentation reference, not a connected customer catalog and not deployed. A public link needs the Vercel permission issue resolved. Never state that the storefront, payment, or Instagram integration is live before client data and deployed tenant setup are complete.

Created `marketing/SPRINT-3-WEEKS-TRACKER.md`, a concise tracker-ready customer-development sprint. The single objective is to identify the first paying ICP and secure five dated pilots. The plan tests offline clothing/footwear stores against one control vertical in week 1, validates the winning segment through 80 personalized Instagram contacts in week 2, and tests action plus willingness to pay in week 3. Total targets: 120 qualified stores, 40 field visits, 25 owner/manager interviews, 80 Instagram contacts, 12 demos, 10 price conversations, at least three owners accepting the price range, and five pilots with an owner and date. Weekly tracker tables and explicit success/failure criteria are included. Corrected the detailed ICP document to the current confirmed public tariffs: 24,900 KZT Start and 34,900 KZT Brand. No code, deployment or public content changed; no runtime checks were needed.

Next marketing action: fill the city/cluster, sprint dates and actuals, then start week 1 with the 50-store research list and 40 scheduled field visits.

Working-path hardening — 2026-09-02:

- Added the real application-side skeleton for Google and Apple sign-in: `SocialAuthButtons`, `/auth/continue`, social-first registration with a passwordless social path, and a server action that attaches a verified social account to a tenant without ever handling an OAuth password. The email/password path, confirmation requirement and existing recovery path remain intact. It fails closed with an honest message until Google and Apple are enabled in Supabase and their redirect credentials are supplied; this is deliberately not claimed as a live OAuth integration.
- Strengthened `/admin/stock` from one narrow “sold in store” action into an auditable working operations table: SKU, variant, low/out-of-stock state, offline sale, stock receipt, write-off and plus/minus correction. The new actions insert `stock_movements` only, so the existing database trigger remains the sole authority that changes `stock_qty`; negative stock is rejected by the database and converted to a clear UI error.
- Found and resolved a local runtime blocker: the Next.js `.next` cache was corrupted and missed the compiled `lucide-react` vendor chunk, producing a generic 500 server page. Only the disposable build cache was removed after the exact path was verified, then regenerated. Fresh production build output now has `BUILD_ID=vd88sxTZEvaLOLnixkcwN`; a clean local production server returned HTTP 200 for `/`, `/login`, `/register`, `/admin/stock`, `/admin/catalog/new`, and `/legal/privacy`.

Checks: `npx tsc --noEmit` passed after the auth and stock changes. `npm run build` regenerated a clean `.next` build; local production smoke checks above passed.

Current implementation boundary: Polar cannot collect real subscription payments until a Polar organization/product IDs, server access token and webhook secret exist, and its merchant/Kazakhstan availability has been verified. Azure AI likewise remains deliberately disabled until the owner provisions a Foundry model deployment plus Key Vault/server credentials. Higgsfield can be used as a cinematic background only after the owner exports the selected MP4 into the repository; no screenshot is being represented as a video. Next: run authenticated Supabase smoke tests with real OAuth configuration, then rebuild the marketing landing in code as a unified Black Jade/Aged Gold system rather than adding another CSS layer.

Deployment attempt — 2026-09-02:

- A production release was attempted with the local Vercel CLI after the clean build and smoke checks. Vercel accepted the CLI session but rejected the target `dukenim-new` with `Not authorized`; no deployment or domain/DNS change occurred. This is an account/team-project permission issue, not a source-code failure. Do not retry until the Vercel owner signs in locally or grants the current Vercel identity access to the project/team.

Figma navigation correction — 2026-09-02:

- The shared Figma URL had opened the empty `Cover` canvas (`0:1`), which contained only the uploaded monolith reference. The approved editable hero is now also present on that starting canvas as `START HERE — Hero / Monolithic Atelier` (`83:2`), so opening the file no longer leads to a blank design area. The original uploaded image was deliberately preserved; no user asset was deleted.
- Actual working screens remain separate editable frames: hero `51:19`, AI Studio `55:14`, and pricing + CRM integration `72:20`. Each direct node was rechecked through Figma MCP. These are design workframes, not a declaration that the full product design is complete.

Next Figma action: build the remaining landing blocks and customer/dashboard flows as independent editable frames, then create a complete clickable prototype before code implementation.

Public tariff and integration groundwork — 2026-09-02:

- Rebuilt the public tariff block as a working monthly/annual selector: «Старт» is 24 900 ₸/month or 239 000 ₸/year, «Бренд» is 34 900 ₸/month or 335 000 ₸/year. The selected period changes visible price, saving and registration URL. The lower-friction monthly state is the default.
- Added the public CRM connection explanation with the confirmed launch condition: standard 70 000 ₸ crossed out → 0 ₸ while the launch promotion runs, but only after technical preflight. It never asks for a CRM password and does not claim any connector is already active.
- Added source-only CRM integration infrastructure: migration `202609020001_crm_integration_requests.sql`, owner route `/admin/integrations`, root route `/root/integrations`, tenant-safe request statuses and root audit events. The migration is not applied to production yet; no customer CRM data or secrets were transmitted.
- Added Azure Foundry server-only configuration placeholders to `.env.example` and `AI_CRM_PRODUCT_SPEC.md`. Azure is not connected yet: it still needs a real Foundry resource/model deployment, Key Vault and budget alerts before any token-consuming endpoint is enabled.
- Corrected the hero demo so its final state says «Владелец получил новый заказ», not a false payment confirmation.

Checks: `npx tsc --noEmit` passed. The local production build completed after clearing a corrupted OneDrive `.next` cache; a local `BUILD_ID` was produced. Playwright verified the monthly→annual switch (239 000 / 335 000, `billing=year`) and the CRM disclosure. Local visual artifacts: `output/playwright/landing-hero-desktop.png`, `output/playwright/landing-pricing-desktop.png`.

Next recommended implementation: apply the CRM-request migration in a reviewed release, then implement the Azure server gateway and AI draft ledger before exposing an active AI Studio action. Keep Higgsfield videos as atmospheric media only; all functional UI remains editable React/Figma components.

Created `marketing/ICP-AND-21-DAY-GTM.md`, a field-ready go-to-market plan for the first 21 days. It defines segmentation across niche, sales format, scale, current technology, workflow, pain, trigger and buying authority; identifies the primary launch ICP as an independent visual retailer with one to three offline locations, active Instagram, manual Direct/WhatsApp orders and meaningful stock/variant complexity; and separates acquisition channel from customer segment. It includes six ICP groups, anti-ICP rules, a 16-point lead score, daily/weekly quotas, an offline owner-interview script, Instagram outreach/follow-up scripts, research fields, funnel metrics and explicit week-three decision gates. Existing directional 2GIS data supports testing clothing/footwear first and cosmetics/jewelry or children's goods as the control vertical, but is not treated as exact TAM. The plan uses the confirmed 17,000/24,900 KZT prices for willingness-to-pay testing and explicitly forbids accepting payment or promising production readiness before the release gate is complete. No product code or public social content changed; no runtime checks were needed.

Next recommended marketing action: choose one dense local shopping cluster, list 12 independent clothing/footwear stores, prepare the 60–90 second buyer-to-owner demo, and run the Day 1 quota of 8–12 visits, five conversations and two scheduled demos. Record every result in a structured lead sheet and do not treat polite interest as a pilot without a dated next action.

Created an editable AI-product direction in Figma before touching application code. The new `AI Studio / Controlled storefront design` frame (`55:14`) lives beside the landing hero directions in the existing Figma file. It states the intended product honestly: a Brand user gives a structured shop brief, sees three selectable directions (`Atelier`, `Journal`, `Gallery`), gets a live storefront preview, edits it, and publishes only after owner confirmation. The section deliberately positions AI as a controlled draft generator based on Dukenim components, not an unbounded “make any website/code from one prompt” promise. Its last visual check was rendered from Figma at 1440×920; all text, cards, phone preview and workflow are independent editable layers.

Higgsfield was rechecked after the owner upgraded: the workspace reports `Starter` and 210 credits. A 5-second Seedance 2.5 hero motion was costed at 32.5 credits, but the provider rejected the job because that model requires a Plus plan or higher. No video was created and no credits were spent. Do not substitute an AI video for the real interactive interface. Azure credits should power server-side, schema-validated catalog/theme drafts, copy assistance and later support tooling; only connect a model after Microsoft Foundry access, company verification and per-tenant/platform token limits are configured. The current owner-facing decision still needed before implementation is whether AI Studio remains Brand-only and what monthly revision allowance it receives.

Figma-first landing work was corrected after the initial raw hero did not meet the requested reference quality. The earlier `25:5` frame is deliberately retained only as `Archive / Hero V0 — rejected`. Page `01 — Landing Rebuild` now has three complete desktop directions: A `Hero / Monolithic Atelier` (`43:14`), B `Hero / Obsidian Gallery` (`45:14`) and C `Hero / Kazakh Future` (`45:101`). Each is 1440×920 and keeps the Black Jade + Aged Gold system, the actual Dukenim logo and the approved core promise «Одна ссылка вместо сотни сообщений». The original basalt/brass material (`public/design/dukenim-hero-monolith-base-v1.png`, Figma asset `38:2`) is used only as the architectural material base; the CRM, product card, phone, CTAs and four-stage purchase story remain independent editable Figma layers rather than a screenshot. A visual-design audit board in the file records the selection criteria: one coherent right-side sculptural cluster, visible CTAs in the first viewport, two brass routes maximum, full phone visibility, and ornament only as a quiet engraving. `Hero / Monolithic Atelier — mobile` (`49:14`) is a separate 390×844 composition, not a reduced desktop. The selected desktop direction now also has an actual 2.4-second Figma timeline: product card moves into the cart, confirmation appears, and CRM responds; the animated nodes are `43:70`, `43:51`, `43:78`, `43:88`, `43:64`, and `43:91`. Do not implement any hero in code yet: owner selection or a specific hybrid request is still required before engineering and remaining landing blocks. No application code changed.

Created `ARCHITECTURE.md`: a complete Russian system map for the owner and Claude/Codex coordination. It documents the product boundary, route/runtime architecture, Supabase tenant data model, all nine confirmed stages, pricing, catalog lifecycle, storefront/checkout, CRM/staff, Root, resilience, Figma-first design system, exact release gate, and the distinction between applied production state, local code and deferred work. Also created `PROJECT_FOR_FATHER.md` and its visually verified Telegram-ready PDF `output/pdf/Dukenim_Project_Omarov_Nurlan_Serikovich.pdf`, a non-technical and intentionally honest presentation for Omarov Nurlan Serikovich: customer problem, solution, business model, sample economics, current state, risks, and next required steps. No application behaviour changed. Next: use the architecture document as the baseline for the Figma rebuild, then implement selected screens without adding another temporary CSS layer.

Stage 2 messaging is now confirmed for the future landing-page redesign: use «Dukenim — продажи 24/7» as the brand-level eyebrow and «Одна ссылка вместо сотни сообщений» as the primary customer-facing promise. Support it with the truthful product explanation: customers choose and order in the catalog; owners manage products, stock, and orders in one cabinet. Do not lead with «каталог в один клик» because it is both generic and misleading for the real setup flow. Next product stage: registration and first-run journey.

Stage 3 first-run rules are confirmed. Account registration stays minimal; niche and phone belong to catalog creation. The trial is described as neutral full access. Brand-first palette choice, explained Start locks, draft catalogs, and the minimum publication gate (name + at least one priced product + a contact method) are the accepted UX rules. Delivery stays optional and must not render when absent. Next product stage: template families, palette system, and live catalog preview.

Stage 4 catalog-design architecture is confirmed: Start gets «Ателье» and «Маркет»; Brand gets «Журнал» and «Галерея». Storefront template/palette changes must be previewed as drafts and must preserve existing products, orders, and address. Build niche presets on top of four foundations first; add five variations per niche later. Next product stage: public storefront and buyer order path.

Stage 5 buyer flow is confirmed. Checkout remains guest-first. Payment settings are a core feature of both tariffs: show a truthful Kaspi Pay setup centre, never request/store Kaspi passwords, expose Kaspi QR at pickup only when the owner configures it, and expose online payment only after a real provider integration is verified. Add separate inventory reservations with configurable expiry, owner confirmation, availability lock, and one-tap conversion to offline sale at pickup. No real Kaspi Pay payment has been connected yet; owner legal entity/requisites and provider approval are prerequisites.

Stage 6 CRM rules are confirmed: the owner sees orders, reservations, revenue, and stock signals; use the proposed order/reservation status flows and four roles (owner, manager, content manager, seller). Offline sales are a full fast cart, not one-product confirmation: staff can add many products, sizes/colours, and quantities to one cheque; customer data is optional. Next product stage: staff/mobile operational experience.

Refined the Stage 6 team model: common positions are defaults only. The owner can name any role and adjust access module by module in a simple permission builder, including adding/removing access later. Keep ownership, tariff/billing, payment connection, and irreversible account actions owner-only even for a full operational administrator. Next product stage: staff/mobile operational experience.

Stage 7 direction changed: do not defer the application to a PWA-only experiment. Launch a real mobile app with the cabinet, using the same backend, roles, and data; push notifications and camera barcode scanning are first-release requirements. Owners can invite a pre-launch staff member and grant catalog/product/media setup access so the owner is not forced to add the first items. Barcode label printing, fiscal receipts, printer hardware, hardware gifts, and any related tariff promises are explicitly deferred: no code or public messaging until the owner makes a separate decision after testing and economics validation.

Added a shared Claude→Codex request bridge. The project has a terminal command `/dukenim-brief`, but more importantly `CLAUDE.md` now requires Claude to apply the same protocol automatically in every interface before material work or delegation. Claude reads the durable context, checks relevant repository evidence, and returns a concise Russian implementation brief with confirmed constraints, scoped tasks, acceptance criteria, validation, and only real unresolved risks. It then checks Codex’s result against the same brief. This keeps colloquial owner requests intact while preventing invented technical details or repeated work.

Claude’s desktop Project workspace is separate from the local repository and does not automatically receive `CLAUDE.md` or `.claude/commands`. Added `CLAUDE_PROJECT_INSTRUCTIONS.md` for the owner to paste into the Dukenim Project’s **Project instructions** field. This makes the same request-bridge protocol automatic in Claude’s app interface; uploading the file alone is not enough if project instructions are not set.

Changed files: `.claude/commands/dukenim-brief.md`, `CLAUDE.md`, `DECISIONS.md`. Checks: protocol and Claude project configuration reviewed; no runtime application code changed. Next: start a new Claude project chat, write the owner request normally, and confirm Claude begins with `# Задача для Codex` before it works or delegates.

Strengthened registration and storefront completeness. Registration now requires password confirmation and has one accessible show/hide control; server validation independently rejects mismatched passwords. Added optional `delivery_policy` and `return_policy` to `tenant_settings` through production migration `storefront_policies` and local migration `202608170003_storefront_policies.sql`. Owners can save or defer these in Settings; the public storefront renders a delivery/returns section only when the relevant value exists. Verified both columns in production.

Changed files: registration form/action, tenant settings types/queries/actions, settings page, public storefront, policy migration. Checks: `npx tsc --noEmit` passed; Impeccable detector returned no findings. Next: deploy and use an authenticated owner session to verify registration, catalog creation, and optional policy visibility end to end.

Moved template and palette choice into catalog creation, where the owner expects it. First run now has two curated, different visual directions per public plan: «Старт» has «Ателье» (editorial/product-led) and «Маркет» (breadth/category-led); «Бренд» has «Журнал» (collection/story-led) and «Галерея» (premium campaigns/brand-led). A selected coherent palette is persisted to `tenant_storefront_settings` with the catalog; Brand may additionally set a safe custom accent. Server-side validation only accepts the two choices assigned to the tenant’s plan, so the UI cannot bypass feature restrictions.

Changed files: `src/components/admin/catalog-setup-form.tsx`, `src/app/admin/catalog/create/page.tsx`, `src/app/admin/actions.ts`, `src/lib/storefront-theme.ts`, shared decision log. Checks: `npx tsc --noEmit` passed; Impeccable detector returned no findings. Next: deploy and visually inspect the authenticated create-catalog flow.

Refined first-product entry. The photo picker is compact, shows up to four immediate local previews, and marks the first as the storefront cover. The product form now includes a live, compact catalog-card preview that updates with the first image, title, price, and colour label. The catalog-first server guard remains active: only the owner/superadmin catalog creation action can move a tenant out of `not_started`; product creation rejects that state before upload or database mutation.

Checks: `npx tsc --noEmit` passed; Impeccable detector returned no findings. Next: deploy this UI refinement and use an authenticated owner session to verify the complete first-run flow.

Implemented the explicit catalog lifecycle requested by the owner. Registration now leads to a dashboard state where the owner must create and name a catalog before adding products. `tenants` has `catalog_name`, `catalog_status` (`not_started` → `building` → `ready`), and `catalog_created_at`; the migration `202608170002_catalog_lifecycle.sql` is confirmed in the connected Supabase project. `/admin/catalog/new` and the server action both reject product creation when no catalog exists. The first product promotes a prepared catalog to `ready`. Dashboard and catalog empty states now distinguish “catalog not created” from “catalog created but empty”.

Changed files: `src/app/admin/actions.ts`, `src/app/admin/page.tsx`, `src/app/admin/catalog/page.tsx`, `src/app/admin/catalog/new/page.tsx`, `src/app/admin/catalog/create/page.tsx`, `src/components/admin/catalog-setup-form.tsx`, tenant types/queries, and the catalog lifecycle migration.

Checks: `npx tsc --noEmit` passed; Impeccable detector returned no findings. `npm run build` completed compilation and type validation without errors in the local command output. Remaining risk: run the authenticated browser flow once after deployment: register → dashboard → create catalog → add product → catalog list.

Recovered the production commerce operations that were missing from the connected Supabase project. `create_product_with_variants` had already been restored; this session also added `create_storefront_order`, `create_offline_sale`, and `activate_subscription` directly to production and as `supabase/migrations/202608170001_restore_commerce_operations.sql` for durable source control. Verified all five application RPCs now exist with the required signatures: onboarding, product creation, storefront order, offline sale, and subscription activation.

The product form now renders validation, photo-upload, and database failures inline instead of producing a generic server error. An admin route error boundary protects unexpected failures. Checkout now maps courier delivery to the database enum, removes the forbidden “transfer” wording, and does not pretend that online payment works before a provider is connected.

Checks: `npx tsc --noEmit` passed; Impeccable detector returned no findings; production build completed locally. A fresh Vercel preview is still required after these checkout changes.

Remaining risk: an end-to-end checkout submission with an authenticated owner/customer session still needs browser verification after deployment. Do not connect or imply real online payment until a certified provider, merchant verification, and legal review are complete.

## Resilience setup — 2026-08-19

Backblaze B2 is now available for the production backup plan. A private, server-side-encrypted bucket named `dukenim-prod-backups-e7158d` was created. No application key, source upload, or scheduled backup has been created yet; the key must be scoped only to this bucket and stored in a secret manager, never in the repository or shared context.

Cloudflare onboarding for `dukenim.kz` is prepared on the Free plan. The imported web records include the Vercel apex and `www` CNAME; the mail A/MX/TXT records are DNS-only so mail will not be proxied. The public nameservers have not changed and the live site is not yet affected. Activation requires replacing `ns1.hoster.kz`, `ns2.hoster.kz`, and `ns3.hoster.kz` at the domain registrar with the assigned Cloudflare nameservers `alla.ns.cloudflare.com` and `morgan.ns.cloudflare.com`; disable DNSSEC at the registrar first if it is enabled, then verify before enabling origin lockdown.

GitLab is authenticated and the Dukenim group is accessible, but the browser project-creation form did not submit despite valid private-project fields. No mirror repository exists and no source code has been transmitted to GitLab. Next infrastructure actions: finish private GitLab mirror creation, confirm source transfer before first push, create a bucket-scoped B2 application key, add encrypted database/storage backups and restore verification, then perform the registrar nameserver switch with post-switch DNS checks.

Stage 8 root-administration model is confirmed. Stage 9 changes the launch model from a separate beta to direct public production release with a strict readiness gate. Promotional codes are a required part of subscription checkout and root operations: server-validated, auditable, non-stackable by default, and never a substitute for a verified payment integration. Next: resolve the full pre-launch requirements list, obtain owner’s legal/business and commercial-policy inputs, then convert it into phased implementation work.

Launch hardening is now partly applied to production. Migration `202608200001_launch_hardening.sql` created RLS-protected subscription-promotion, subscription-checkout-request, promotion-redemption and platform-audit tables; `202608200003_lock_profile_roles.sql` removed an unsafe self-role-update path; and `202608200004_launch_hardening_indexes.sql` covered all foreign keys introduced by the new tables. They were verified in the connected Supabase project. The implementation provides monthly/annual tariff selection, promo-code validation and an honest “save tariff choice” state instead of a fabricated payment confirmation; password recovery/reset pages; functional mobile storefront navigation; conditional product delivery/return information; expanded legal document templates; and root-side interfaces for promo-code creation and lifecycle. `npx tsc --noEmit` and `npm run build` passed before the migration (only a pre-existing `next/image` advisory in the product form). The narrow hardening migration `202608200002_restrict_guest_checkout_rpc.sql` is intentionally not applied: it removes direct browser access to the legacy guest-checkout RPC and must wait until the updated server checkout route is deployed and a guest checkout smoke test passes. Production email confirmation/recovery also remains blocked on a configured custom SMTP provider; do not claim it is launch-ready until that is done. The Supabase security audit now retains the legacy checkout-RPC notice, the intentional authenticated RLS helper-function notices, and disabled leaked-password protection; the last one should be enabled in Supabase Auth settings before public launch.

## Design handoff — 2026-08-20

The owner supplied `C:\\Users\\Yersat\\Downloads\\IMG_9449.MP4` as the approved motion reference for the Figma-first rebuild. Controls must feel smooth, restrained and physically responsive; motion must explain a state change and respect reduced-motion preferences. The local shell has no video decoder, so the file was recorded as reference but not frame-extracted. Next design work begins with a per-block reference board and Figma component system before UI code changes.

Created Figma file `Dukenim — Product Design System` (`https://www.figma.com/design/ZZlwpD1qf4Ic7o86Cw3K4C`). Phase 1 foundations were created: approved brand primitives, separate semantic collections for Operate and Persuade surfaces (Starter plan supports only one mode per collection), spacing/radius tokens, Manrope text styles, and restrained elevation styles. The Figma Starter MCP quota was exhausted before visual documentation/pages could be created; the blank canvas is expected because variables are non-canvas assets. State ledger: `.codex/figma-design-system-state.json`. Resume by resolving the Figma MCP quota/plan, then create the three-page Starter-compatible structure (Cover, System, Screens & References), a visual foundations board, and pricing reference variants.

Figma has since been upgraded to Professional and the full MCP access restored. The file now has Cover, Getting Started, Foundations, Components, Screens and Reference Board pages. Foundations are documented visually. The first reference board is complete on the `Reference Board` page: three distinct pricing concepts — `Gallery Ledger` (premium two-level composition), `Operator Comparison` (rational feature matrix), and `Two Doors` (sales-led choice of business outcome). The container was visually verified after an auto-layout height correction. Await the owner’s direction choice before converting one concept into a reusable pricing component and responsive screen.

## Latest outcome — 2026-09-02

Integrated the owner-provided Microsoft Foundry deployment at source level without storing the disclosed credential. Added a server-only OpenAI-compatible chat client, strict response validation, request timeout and safe errors; added a superadmin-only test API and `/root/ai` diagnostic UI. `.env.example` now documents the `/openai/v1` endpoint and `Kimi-K2.6` deployment. The credential pasted into chat must be rotated before use; the replacement belongs only in local/Vercel secrets. No deployment or live model call was performed.

Changed files: `.env.example`, `src/lib/ai/azure-foundry.ts`, `src/app/api/root/ai/test/route.ts`, `src/app/root/ai/ai-tester.tsx`, `src/app/root/ai/page.tsx`, `PROJECT_STATE.md`, `AI_HANDOFF.md`. Checks: `npx tsc --noEmit` passed; clean-cache `npm run build` passed with only pre-existing `next/image` advisories. Next: rotate the exposed Azure key, add the three `AZURE_AI_FOUNDRY_*` server-only variables to Vercel, deploy, then test from `/root/ai` while signed in as superadmin.

## Previous outcome

The "stale brand paths/colors" flagged in the previous entry has been corrected at the source: the earlier marketing briefing was produced against `Dukenim_Brandbook_2026_before_gold_update.pdf` (superseded). Re-read the current `Dukenim_Brandbook_2026.pdf` and confirmed the gold system (Black Jade `#071B17`, Aged Gold `#B08A50`, Pale Stone `#F4F0E8`, Graphite `#101713`, Warm Sand `#E8DFD0`, `dukenim-flat-*` masters) is correct — matches `PROJECT_STATE.md` and `DECISIONS.md` exactly. No further brand reconciliation needed from that side.

Delivered `marketing/research/` (2GIS market-count CSVs + methodology README) to close the evidence-rule gap in `marketing/CONTEXT.md` ("2GIS market-count claims are not considered verified until the source CSVs and methodology are present"). See `marketing/research/README.md` for what is and is not yet verified (chain/website exclusion still pending — 2GIS API key partially blocked, see that file).

Deliberately did **not** port over a parallel skills-based content-generation system (trend-research/content-calendar/video-brief-generator as markdown instructions) that was built in the `DUKENIM` repo before this repo's coded marketing engine (dashboard, cron, trend-ingestion endpoint) was known — owner confirmed the coded engine is the one to build on, not a second parallel system.

## Current work in progress

- Product, brand, and marketing changes remain uncommitted in the shared workspace.
- Marketing engine exists locally but production migration/deployment has not been confirmed.
- `marketing/research/` is new and uncommitted — 2GIS counts are directional (city/category size ordering), not yet exclusion-corrected.
- Instagram `@dukenim.kz` is a Business account with category `Software Company`; personal contact details were deliberately not published. On 2026-08-16 the approved bio was successfully saved and verified on the public profile: `Каталог • Заказы • CRM / Клиент выбирает и заказывает сам / 7 дней бесплатно ↓`. The approved name `Dukenim — система для магазина` and link `https://dukenim.kz` remain mobile-only Instagram edits and are not yet verified as published. The current avatar is visible; final comparison with `output/brand/dukenim-instagram-avatar-1080.png` remains pending.

## Verification status

- Previous TypeScript check: passed after marketing engine implementation.
- Previous production build: passed after marketing engine implementation.
- These checks predate later unrelated workspace changes; rerun before release.
- `.claude/settings.json` parses successfully and contains one `SessionStart` hook.
- `.claude/hooks/session-context.ps1` executes successfully with exit code 0 and injects the four shared context files, Git status, and five recent commits.
- Claude Code 2.1.220 is installed correctly; `claude doctor` reports no installation issues.
- Claude is not signed in to `claude.ai`; authentication is the only remaining external step.
- A permitted Claude CLI review of Instagram naming was attempted on 2026-08-14 and returned `Not logged in`; no Claude recommendation was fabricated.
- Did not run `npx tsc --noEmit` or `npm run build` this session — no code was touched, only `marketing/` docs.

## Next recommended action

On the owner's phone, open Instagram → Edit profile and apply the approved name `Dukenim — система для магазина` and link `https://dukenim.kz`; verify the final avatar against `output/brand/dukenim-instagram-avatar-1080.png`. The bio is already public and verified. TikTok registration is open but not completed and requires the owner to provide signup details and OTP. Also authenticate Claude Code once with `claude auth login`. Separately: commit `marketing/research/`, and if city/category prioritization decisions depend on the 2GIS numbers, either complete the chain/website exclusion pass first (needs 2GIS to unblock `/3.0/items`) or explicitly flag any such decision as based on directional, not final, data.

## Handoff contract

After material work, replace the sections above with the latest concise state. Preserve important unresolved risks. Do not paste raw chat transcripts, secrets, tokens, passwords, or personal data.
