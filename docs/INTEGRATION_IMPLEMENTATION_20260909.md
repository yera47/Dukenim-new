# Dukenim — implementation plan for CRM, ERP and POS connectors

Date checked: 2026-09-10. This file records verified partner replies and the technical implementation order. It does not contain credentials, tokens, passwords, personal contact details or legal identifiers.

## Complete provider ledger after the mailbox re-audit

Every one of the 23 outreach targets is listed below. “No reply” means that the sent message or form was checked but no substantive technical answer was present; it does not mean the provider was skipped.

| System | Verified response or delivery state | Current technical state | Next gate |
| --- | --- | --- | --- |
| Rosta | Outreach delivered; no substantive reply found. | No credential and no verified onboarding route. | Await provider response. |
| UMAG | Partnership form submitted; no follow-up email found. | No credential. | Await provider response. |
| Paloma365 | Outreach delivered; no substantive reply found. | No credential. | Await provider response. |
| BILLZ | Developer mailbox bounced; retry delivered to the verified general mailbox. | No credential or onboarding instructions. | Await routed technical reply. |
| МойСклад | Support directed Dukenim to developer registration and Vendor API documentation. Official documentation also confirms that a regular account can use JSON API without separate API registration. | No key was sent. A private pilot can use a regular test account; a scalable marketplace solution receives a per-account bearer token through Vendor API on installation. | Owner-handled password for the regular test account; legal and banking eligibility before marketplace publication. |
| RetailCRM | Ticket acknowledgement received. | No technical decision or credential. | Await specialist response. |
| Бизнес.Ру | Support confirmed orders, reservations, status/cancellation, webhooks and a default 500 requests per five minutes, then sent the requested test invitation on 2026-09-10. | Email verification is ready and will create a Bизнес.ID/company account; no API key has been issued yet. Each test store creates its own API integration. | Explicit confirmation of account/company creation, then owner-handled password/OTP if requested. |
| Subtotal | Outreach delivered; no substantive reply found. | No credential. | Await provider response. |
| inSales | Partner support requires partner registration, agreement, a partner-created store converted to a test store, technical tickets and a final online demo. | No credential. The scalable route is an application installed by each shop. | Verified legal identity and agreement eligibility; ask whether a pre-contract private sandbox is available. |
| Kommo / amoCRM | Outreach delivered; no substantive reply found. | No application credential. | Await provider response or register an OAuth integration after legal/account review. |
| Bitrix24 | Support described technology partnership, Marketplace publication and a 15-day `.kz` demo portal. | No key. Scalable connection requires an OAuth application installed by each portal administrator. | Await regional moderator/partner route; a local webhook is not production acceptance. |
| Planfix | Test account and account-owned OAuth application exist. Owner approved the seven displayed minimum scopes. Repeated production callbacks now pass session/state validation and reach the token endpoint, which returns a non-JSON successful response instead of the documented token JSON. Planfix itself displays that API access is available only on paid or Premium accounts. | Connector, encrypted token storage and idempotent manual order sync are implemented. The apex/`www` state-cookie hardening and safe staged OAuth diagnostics are deployed. No token or remote order has been created. | Ask Planfix whether API should be enabled during this 14-day trial or select a paid/Premium plan with explicit owner approval; do not pay or transmit an order automatically. |
| Мегаплан | Technology partnership welcomed; support directed Dukenim to register an account, add an application and submit it for moderation. A clarification request was sent. | No application UUID/token. Official API v3 and webhooks are available. | Await clarification, then create the test application with explicit account-creation approval. |
| S2 / SalesapCRM | Outreach delivered; no substantive reply found. | No credential. | Await provider response. |
| OkoCRM | Outreach delivered; no substantive reply found. | No credential. | Await provider response. |
| EnvyCRM | Outreach delivered; no substantive reply found. | No credential. | Await provider response. |
| keyCRM | Support supplied a test-account registration link, public API documentation and support channels. | No key was sent. The credential is generated inside each merchant account and must remain server-only. | Explicit account-creation confirmation, then owner-handled password/SMS if requested. |
| SalesDrive | Partnership form submitted; no substantive follow-up found. | No credential. | Await provider response. |
| iiko | Head of technology partners confirmed the API is open and explicitly permitted Dukenim to build and pilot; integration support is unavailable and partner applications are closed during 2026. | No key was sent. A working cloud pilot still needs an `apiLogin`/test organization issued or enabled for a venue. | Ask how a Kazakhstan test venue obtains `apiLogin` and whether each production venue supplies its own credential. |
| r_keeper | White Server API v2 guidance and a three-month test stand for 10,000 RUB were offered. Support replied to the no-payment clarification and directed all product, price and deployment questions to an official regional dealer. The official list identifies gold partner ТОО «КИПЕР.KZ» for Kazakhstan. | No credential; no payment or contract accepted. A complete dealer email is saved as a draft. | Confirm sending the dealer request, then await the demo-object/license/commercial proposal. |
| Poster | Outreach delivered; no substantive reply found. | No OAuth application credential. | Await provider response or official developer registration route. |
| Quick Resto | Outreach delivered; no substantive reply found. | No credential. | Await provider response. |
| JOWI | Email bounced; the request was delivered to official Telegram support and acknowledged. | No current API 2.0 access or credential. | Await technical contact and test-venue instructions. |

No partner has sent a production API key, client secret or access token. The mailbox search explicitly covered `token`, `API key`, `client_id`, `client_secret`, invitation, sandbox and test-account terms. What arrived were registration invitations and documentation. This is expected: application credentials identify Dukenim, while every merchant or venue must separately authorize its own account. Tokens must never be pasted into the normal integration-request form or committed to source control.

## Acceptance checklist

| Requirement | Status | Evidence or blocker |
| --- | --- | --- |
| List every system from the 23-company outreach wave | verified | The shared registry and grouped owner catalog contain all 23 targets; 1C and an `other` fallback are additional options. |
| Let one store track several integrations without overwriting them | verified | Production migration `20260910111537` enforces one row per `(tenant_id, provider)`; owner and Planfix writes use that conflict key. |
| Keep unimplemented systems honest | verified | Cards show authorization route and request state; only Planfix exposes a connector action. |
| Preserve per-merchant authorization | verified | UI copy and provider modes require OAuth, app installation or a merchant-issued key for the individual merchant where applicable. |
| Connect Planfix to a real merchant account | externally blocked | Login and repeated seven-scope consent are complete. Production reaches the Planfix token endpoint but receives a non-JSON success response; the Planfix account UI says API access is limited to paid or Premium subscriptions. No token was stored. |
| Build working adapters for every listed provider | externally blocked | No other provider has issued the required test account/application credentials or confirmed its final scalable onboarding route. Adapter work starts provider by provider when official access exists. |
| Follow up with r_keeper without accepting costs | verified | The no-commitment clarification was sent; support directed Dukenim to an official dealer. A no-payment draft to the Kazakhstan gold partner is ready for confirmation. |
| Receive Business.Ru test access | in progress | The provider delivered the invitation and email-verification link. Final verification creates an account/company and therefore awaits explicit confirmation. |

## Implementation order

1. **Planfix pilot — in progress.** Use global OAuth endpoints, mandatory PKCE S256 and the minimum scopes: `openid`, `email`, `contact_readonly`, `contact_add`, `task_readonly`, `task_add`, `task_update`.
2. **Megaplan application.** Build after its test-account and installation rules are clarified. Use application UUID/token, not customer passwords.
3. **Bitrix24 scalable OAuth connector.** A local `.kz` portal can validate field mappings, but production waits for a technology-partner application.
4. **inSales shop application.** Implement install/uninstall callbacks, per-shop credentials, HTTPS-only callbacks, webhook verification and the documented rate limit after partner/test-shop registration.
5. **r_keeper White Server.** Start only after aggregator token, test object and license terms are issued. Its asynchronous task queue requires callback/polling reconciliation.
6. **Business.Ru, BILLZ and JOWI.** Begin only when their teams confirm current credentials, test access and contract path.

## Shared connector architecture

- Canonical Dukenim events: customer upsert, product/variant snapshot, stock availability snapshot, order created, order status changed and cancellation requested.
- Dukenim remains the source of the storefront order and immutable KZT totals. A connected operational system remains the source of its own processing status.
- Every outbound event has an idempotency key derived from provider, tenant, entity UUID and event version. Provider-native external-object IDs are stored separately from credentials.
- Tokens are server-only. A later credential table must be inaccessible through the browser/RLS client and store only encrypted token material or a server-side vault reference.
- OAuth state and PKCE verifiers are one-time, tenant-bound, user-bound and short-lived. Redirect issuer and provider account domains are allowlisted.
- Retries use an outbox with bounded exponential backoff. A storefront order must not fail merely because a partner API is temporarily unavailable.
- Provider callbacks go through an inbox table with signature/token validation and unique event IDs. Duplicate callbacks are acknowledged without repeating state or stock changes.
- External status changes map through an explicit per-provider table. Payment status is never inferred from an order status. Inventory changes inside Dukenim continue to use `stock_movements`.
- Logs and owner-facing errors are redacted. Access tokens, refresh tokens, application secrets and raw webhook URLs are excluded from logs, analytics and shared documents.

## Planfix pilot acceptance scenario

1. Owner creates a disposable Planfix test account and an OAuth application with redirect URI `https://www.dukenim.kz/api/integrations/planfix/callback` (completed for the account-scoped pilot on 2026-09-09).
2. Owner connects the account from Dukenim and approves the minimum scopes; Dukenim validates the signed-in owner/tenant, encrypted `state`, expiry and PKCE before exchanging the code.
3. A synthetic Dukenim customer is created or matched using its stable UUID as `sourceObjectId`.
4. A synthetic order totaling exactly 21,700 KZT is sent as a Planfix task using the order UUID as `sourceObjectId`; items, quantities, delivery and payment state appear in the description.
5. Replaying the same event does not create a second task. A newer `sourceDataVersion` may update the same task only after an explicit status mapping is configured.
6. Revoking the connection prevents further calls, does not delete the Dukenim order and does not expose the refresh token.

## Implemented in this slice

- A single provider registry now covers all 23 systems in the first outreach wave plus 1C/other fallback and groups them for the owner UI.
- The integration request action validates against that registry; root and owner pages use the same labels.
- A forward-only database migration expands the existing provider constraint without changing existing rows or adding credential storage.
- The owner integration page now renders the full provider catalog, explains each authorization model and tracks one independent request/status per tenant and provider. Selecting or postponing one system no longer overwrites another system's request.
- Production migration `20260910111537_multi_provider_integration_requests.sql` replaces the former one-row-per-tenant constraint with a unique `(tenant_id, provider)` index. RLS remains enabled; database metadata verifies the old tenant-only constraint is absent and the new unique index is active.
- Commit `6db9f75` is published; Vercel deployment `HAZT71ska8ew9yYfn2FC23jZodcX` completed successfully. Authenticated production acceptance saved a separate r_keeper planned request and then reloaded Planfix with its previous queued status, URL and note intact.
- The Planfix adapter implements PKCE generation, the global authorization URL, authorization-code exchange, token refresh response validation, strict Planfix-domain validation and deterministic customer/order payloads.
- The Planfix task payload uses `sourceObjectId` and `sourceDataVersion`, preserving integer KZT totals and a stable idempotency identity.
- A Planfix test account in the Central Asia data region and a confidential account-scoped OAuth application were created after separate action-time confirmations. Only profile, contact add/read and task add/read/update access is configured. The one-time secret is not present in source, shared documentation or chat output.
- Connect and callback routes now bind OAuth state to the signed-in user and tenant, use PKCE, encrypt the short-lived state cookie and encrypt token material with AES-256-GCM before server-only database storage.
- The two reviewed migrations were applied individually to the linked production database and recorded in migration history. The new server-only `integration_connections` table has RLS enabled, no browser-facing policy, explicit anonymous/authenticated revocation and verified service-role CRUD access.
- All four Planfix values are stored as non-revealable Vercel Production secrets. No credential-shaped value is present in Git commit `1101b90`.
- The callback now validates the encrypted OAuth state before accepting either success or denial and derives the stored account URL only from the allowlisted `*.planfix.com` account domain.
- The deployed connect/callback foundation is now extended locally with a manual owner-only order sync. It creates a Planfix contact and task from the real Dukenim order, preserves integer KZT totals, refreshes rotating OAuth tokens atomically and stores provider IDs separately from credentials.
- A server-only `integration_entity_links` ledger prevents duplicate contacts/tasks. Network interruptions after a possible provider acceptance become `uncertain` and are never retried blindly. Its production migration `20260910101627` is applied and recorded; RLS is enabled, anon/authenticated SELECT is denied and service-role CRUD is verified.
- The order page discloses which customer/order fields are transmitted and shows the manual sync action only for connected Planfix accounts and non-reservation orders.
- The full local suite passes: 355 tests, strict TypeScript and the production build.

## Not implemented yet

- The original OAuth/connect source and the guarded manual order-sync source are deployed in production from commit `b2b9a56`; Vercel reported success on 2026-09-10.
- The Planfix account and account-scoped OAuth application exist, but no merchant authorization grant, access token or remote contact/task has been created yet.
- Planfix login and consent are complete, but the provider does not return the documented token JSON for this trial account. Its account UI states API access is restricted to paid or Premium subscriptions; support or an explicitly approved paid plan is required before another acceptance attempt.
- Automatic outbox delivery, inbound callbacks, provider field-mapping UI, token revocation UI and live end-to-end order synchronization remain after the first authorization grant. The current implementation is deliberately manual and outbound-only.
- Business.Ru delivered its test invitation; final email verification creates a company/account and awaits explicit confirmation. r_keeper received the no-payment clarification and has not yet answered it. Neither provider has issued credentials. keyCRM and regular MoySklad test accounts still require explicit account-creation confirmation and owner-handled password/SMS steps.
- The full catalog and multi-provider request storage are implemented, but only Planfix currently has connector code. The other cards deliberately show request/review state until each provider issues a supported test account, application credential or merchant authorization route.
- No contract, public offer, paid license or partner agreement was accepted.
