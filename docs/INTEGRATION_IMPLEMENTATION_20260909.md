# Dukenim — implementation plan for CRM, ERP and POS connectors

Date checked: 2026-09-09. This file records verified partner replies and the technical implementation order. It does not contain credentials, tokens, passwords, personal contact details or legal identifiers.

## Result of the first response round

| System | Verified response | What it means for Dukenim | Current gate |
| --- | --- | --- | --- |
| Planfix | A standard account is sufficient to start; the complete product is available for a 14-day pilot. | Best first technical pilot. The public REST API supports global OAuth 2.0 Authorization Code with mandatory PKCE S256, per-user permissions, 24-hour access tokens and refresh tokens. | The `dukenim.planfix.com` Central Asia test account, account-scoped confidential OAuth pilot application, production connect/callback routes, encrypted token storage and order-sync ledger now exist. The remaining gate is the owner's private login/password recovery followed by an owner-approved authorization grant. |
| Megaplan | The integration proposal is welcome. Dukenim may become a technology partner and publish an application in the application store and integrations directory. Register Megaplan, create an app and submit it for moderation. | Strong second pilot. Current application authentication uses an application UUID and API token; password-based application authentication is deprecated. | Wait for clarification about a test account, partner status and closed pilot, then create the app with explicit owner approval. |
| inSales | Partner support directed Dukenim to the official developer guide. | The install flow creates a separate password for each shop from the one-time install token and application secret. Webhooks cover order create/update/delete; documented limit is 500 requests per shop per 5 minutes. | Partner registration and a test shop are required. Do not start the final registration until the owner's actual legal status and the applicable agreement are known. |
| r_keeper | Support supplied White Server API v2 and integrator quick-start documentation and directed test-stand requests to `integrations@rkeeper.ru`. | The API supports menu, stop-list, validation, order creation, status, cancellation and prepayment operations. It is an aggregator-level integration, not per-restaurant OAuth. | A test-stand request is prepared but not yet sent. r_keeper still must issue the aggregator token/test object and clarify paid licenses before infrastructure is provisioned. |
| Bitrix24 | Support described technology partnership, Marketplace publication and a 15-day demo portal; Kazakhstan scenarios should use the `.kz` zone. | A local app or webhook is useful only for a single test portal. The scalable product must be a registered OAuth 2.0 application installed by each portal administrator. | Await the regional moderator/partner route. Do not confuse a local webhook proof with the final multi-tenant connector. |
| Business.Ru | Support confirmed customer orders, reservations, status/conducted-document cancellation, webhooks and a default limit of 500 requests per five minutes. They offered a test-account invitation; each test store creates its own API integration in the application marketplace. | This is a viable merchant-authorized pilot without a shared master token. Dukenim must create missing counterparties/products before orders and preserve the provider-issued order ID alongside Dukenim's external ID. | Reply with the monitored email for the test invitation. Becoming a formal partner still accepts a public offer, so do not press that later partner button until the legal identity is known. |
| BILLZ | The first developer mailbox bounced; a retry was sent to the verified general mailbox. | API capability is advertised, but no usable credentials or onboarding procedure has been received. | Wait for a routed technical reply. |
| JOWI | The email bounced; the request was delivered to the official Telegram support chat and acknowledged. | Old developer material exists, but API 2.0 access and current partner rules are not yet verified. | Wait for the API/integrations contact and test-venue instructions. |
| RetailCRM | Ticket creation acknowledgement only. | No technical decision yet. | Wait for a specialist response. |
| MoySklad | Out-of-office notice through September 13. The official site confirms that ordinary JSON API testing needs only a regular account, while marketplace publication requires an IP/legal entity in Russia or the CIS, a RUB settlement account and software development as the primary activity. | A regular 14-day test account is enough for a private API pilot; the public marketplace application is not currently eligible without verified legal and banking details. | The registration form is ready, but the owner must privately choose a password. Do not submit the developer marketplace form with invented legal details. |

No partner has sent a production API key. This is expected: application credentials identify Dukenim, while every merchant or venue must separately authorize its own account. Tokens must never be pasted into the normal integration-request form or committed to source control.

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
- The full local suite passes: 340 tests, strict TypeScript, production build and diff validation.

## Not implemented yet

- The original OAuth/connect source is deployed. The new manual order-sync source and UI are local only and have not been committed, pushed or deployed.
- The Planfix account and account-scoped OAuth application exist, but no merchant authorization grant, access token or remote contact/task has been created yet.
- The owner must complete Planfix password recovery/login privately before the final OAuth authorization action can be presented.
- Automatic outbox delivery, inbound callbacks, provider field-mapping UI, token revocation UI and live end-to-end order synchronization remain after the first authorization grant. The current implementation is deliberately manual and outbound-only.
- Business.Ru test access and the r_keeper stand request are drafted but not sent; neither provider has issued credentials yet. keyCRM and regular MoySklad test accounts still require owner-handled password/SMS steps.
- No contract, public offer, paid license or partner agreement was accepted.
