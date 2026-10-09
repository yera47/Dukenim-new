# AI product-photo acceptance — 2026-10-09

This is the single acceptance checklist for the local Azure product-photo implementation. It does not authorize production changes or paid inference.

| Requirement | Status | Evidence / blocker |
| --- | --- | --- |
| Tenant-bound 2–5 output request | verified | `product-photos/route.ts` ignores client tenant/storage identifiers, validates files and pack size, and derives tenant/user from the authenticated session. Route tests pass. |
| Server-side provider price ceiling | verified | `generateProductPhotoPack` rejects unknown prices and packs above `AI_PRODUCT_PHOTO_MAX_PACK_USD_MICROS` before reservation/provider execution. Unit test passes. |
| Atomic credit and USD reservation | verified in code; externally blocked in database | Migration RPC locks platform, tenant account and tenant rows, verifies an active exact price rule, then reserves credits and tenant/platform USD capacity in one transaction. Applying/testing against Postgres was not authorized and no local Postgres is installed. |
| Idempotency and concurrency | verified in code; externally blocked in database | Tenant + idempotency key is unique; RPC returns `acquired=false` for an existing claim. Per-output provider keys are deterministic and distinct. Physical concurrent SQL regression needs Postgres. |
| Durable output before debit | verified | Azure adapter accepts bounded JPEG bytes or downloads a provider URL through an HTTPS/private-address/redirect/content-type/size guard, persists to the private `ai-product-photos` bucket, then journals the path. Responses use 15-minute signed URLs. Settlement counts every durable output, not a caller-selected subset. |
| Success-only credit debit and technical refund | verified in code; externally blocked in database | Partial settlement charges only durable successes; confirmed `not_billed` failures refund unused reservation, while ambiguous billing remains `uncertain` for reconciliation. SQL application/regression is blocked as above. |
| Tenant isolation / RLS | verified by static SQL test; externally blocked in database | Seven exposed tables have RLS; direct client writes and privileged RPCs are revoked; owner reads use `can_manage_tenant`. AI review files use a separate private bucket and short signed URLs. Live advisor/RLS tests require applying the migration. |
| Platform kill switch and tenant/global caps | verified | Migration seeds only a kill-switched zero-cap platform row. No allowance, price or spend cap is seeded. Static migration test passes. |
| Real Azure generation | externally blocked | `FLUX.2-pro` v1 is available to the Sweden Central resource catalog but is not deployed. Pricing is known; remaining Sponsored credit coverage is not, because the billing balance endpoint returned 404 while `spendingLimit=Off`. No inference request was sent. |
| Production enablement | externally blocked | Requires reviewed migration application, provider deployment/key, exact price rule, explicit tenant allowance/caps, storage access check and a separately approved bounded paid smoke test. |

## Exact settings still required

Server environment (all server-only):

- `AZURE_AI_FLUX_ENDPOINT`
- `AZURE_AI_FOUNDRY_API_KEY`
- `AZURE_AI_FLUX_DEPLOYMENT=FLUX.2-pro`
- `AZURE_AI_IMAGE_SUPPORTS_REFERENCE=true`
- `AZURE_AI_IMAGE_ESTIMATED_USD_MICROS=<confirmed per-output ceiling>`
- `AZURE_AI_IMAGE_TIMEOUT_MS`
- `AI_PRODUCT_PHOTO_RESOLUTION=<price-rule resolution>`
- `AI_PRODUCT_PHOTO_MAX_PACK_USD_MICROS=<approved per-request ceiling>`
- `AI_PRODUCT_PHOTO_LIVE_ENABLED=true` only after every database/storage check below passes

Database rows/actions (none are included in the migration):

- Apply `20261009181408_ai_product_photo_generation_ledger.sql` after review.
- Insert one confirmed, initially inactive `ai_product_credit_price_rules` row, then activate it only after provider price verification.
- Create each tenant's `ai_product_credit_accounts` row with explicit allowance, tenant USD cap and `generation_enabled=false`; enable only after acceptance.
- Set an explicit non-zero platform cap and turn off the platform kill switch last.
- Verify the migration-created private `ai-product-photos` bucket accepts server-side upload and signed-read for the tenant path.

## Recovery procedure

- Provider timeout before a result: keep `uncertain`; locate the request by its deterministic idempotency key and Azure logs. If confirmed not billed, call the service-only release RPC. If billed with no image, journal it with `reconcile_ai_product_provider_cost`, then settle with zero successful outputs; customer credits are refunded while provider spend remains accounted.
- Image stored but output journal failed: read the private path/provider metadata from the `uncertain` ledger event, rerun `record_ai_product_output`, then settle. Do not regenerate.
- Output journaled but settlement failed: rerun the idempotent settlement RPC with all durable provider request IDs. Do not regenerate.
- Partial pack plus ambiguous final attempt: reconcile that provider attempt first; then settle all recorded outputs. Customer credits are charged only for outputs, while provider-cost rows separately retain estimated and actual cost fields.

## Read-only Azure facts for one future approval

- Existing access: authenticated `Azure subscription 1`, `Sponsored_2016-01-01`, Microsoft Customer Agreement; no key was read or transferred.
- Resource: `ersatik-8074-resource`, Sweden Central, AIServices S0. Current deployments: only `Kimi-K2.6`.
- Candidate: `FLUX.2-pro` v1, Foundry model sold by Azure, Global Standard or Data Zone Standard, one output/request, up to eight input images, maximum 4 MP; default Low limit 15 RPM.
- Sweden Central list meters: Global Standard $0.03 initial MP + $0.015 output/additional MP + $0.015 reference MP; Data Zone $0.033 + $0.0165 + $0.0165. Final bill formula still needs confirmation on the deployment review screen.
- Credit coverage: unverified. Subscription state is Enabled but `spendingLimit=Off`; the aggregate balance endpoint returned 404. Therefore even a tiny smoke test cannot yet be certified as covered by credits.
- Narrow future approval proposal, not authorization: apply only the single ledger/private-bucket migration; deploy `FLUX.2-pro` Global Standard; allow one request with one <=1 MP source and one <=1 MP output, with a hard application cap of $0.10 and no retry. Proceed only after the portal confirms enough remaining Sponsored credit and the exact estimated charge.

The proposed 90-photo allowance and proposed $5 smoke-test ceiling are intentionally not encoded because they are not approved terms.
