# Dukenim: owner-requested product rebuild

Confirmed direction: monochrome platform, AI Studio as the primary owner workspace, useful mobile controls, niche-specific customer storefronts. No claim of complete release readiness from a passing build.

## Completed source slice 95b38d1

- AI accessible before catalog/product completion; chat-like task composer + explicit result + embedded editors.
- Persisted generated category names can be applied with tenant/RLS checks and retry-safe keys.
- First catalog/product saves return to Studio; last structure is restored.
- AI in mobile primary navigation; domains guidance; pricing explains both plans.
- Root access updates validate input, pre-audit and update plan/status together.

## Next deliverables and acceptance criteria

1. Real conversational assistant: persisted per-tenant conversation history, constrained tool proposals, explicit preview/apply, retry recovery, readable errors. Do not merely relabel the current one-request generator as a full chat agent.
2. Complete catalog launch: preview the actual selected storefront template; guided contact/delivery setup; explicit publication readiness; test new owner to guest order. Preserve existing goods and addresses on design changes.
3. Niche system: first shared preset engine and interactive previews are complete for fashion, beauty, food, flowers/gifts, services, events, home and other. Remaining: apply the hierarchy to real published storefront navigation and business-specific owner prompts. Services explicitly accept a request and do not pretend retail stock is appointment scheduling.
4. Media: six coherent Higgsfield demo photographs and one inspected monochrome six-second promo film are integrated and clearly labeled as demonstrations. Remaining: replace the remote generated-media URL with durable owned storage before treating it as archival production infrastructure; never present generated fake UI as a recording of working functionality.
5. Root workspace: searchable tenant list; catalog/product editing and archiving with reason/audit; before/after diff; recovery; support context; incident diagnostics and truthful analytics. Protect owner credentials, payment state, data isolation and immutable order/stock history. Avoid unbounded delete or arbitrary SQL controls.
6. Domains: current source is a human-assisted guide only. Automated domain ownership proof, hosting mapping, correct per-domain DNS target, TLS validation, status/retry and anti-takeover checks are still needed.
7. Pricing: keep existing confirmed prices until a new owner pricing decision; AI on both plans. Validate credit economics and clarify limits, trial expiry and optional subscription purchase. No autocharge claim without actual consent.
8. Release audit: cross-tenant categories through the legacy product RPC are now blocked in production. Remaining: owner/customer/root role coverage; optimistic stock integrity; payment/webhook idempotency; mobile keyboard/navigation/focus; support handoff; legal/payout/backups/monitoring; EAS/APNs and signed native release separately.

## Reference inspection

- https://www.zara.com/kz/ : category and collection hierarchy inspected. Do not copy brand assets or claim measured conversion superiority.
- Wolt Almaty reference could not be retrieved during this pass; no findings claimed.

## External gates

Higgsfield started this slice at 134 credits with no unlimited allowance. Owner authorized continued work; six 2K images and one six-second 720p video consumed 27 credits. The API balance was rechecked after completion: 107 credits remain on Starter.
Native release still needs authenticated EAS/signing and device checks. Public paid service readiness still depends on real payout, legal and resilience verification.
