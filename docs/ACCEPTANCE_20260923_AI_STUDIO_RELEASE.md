# AI Studio, employees, publication and payment acceptance — 2026-09-23

## Result

The mobile AI Studio was rebuilt as a bounded chat workspace based on the supplied reference package. The result keeps one scrollable conversation, a compact result card, a fixed composer, a fixed mobile navigation bar and a publication control beside the composer. The nested storefront iframe and the long settings stack were removed from the ready state.

Broken employee invitation links now use a query token that survives login, registration and email confirmation. Production checkout for the Dukenim subscription fails closed until a real Polar charge and signed webhook have been verified; while that external activation is incomplete, the owner receives a clear tariff payment request instead of being sent to the unusable Polar test checkout.

## Acceptance checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| AI Studio matches the supplied mobile structure | verified | Local Playwright at 390×844 and 1440×900: no iframe, no horizontal overflow, no document scroll; composer and navigation do not overlap. Captures: `output/audit-ai-studio-390-20260923.png`, `output/audit-ai-studio-1440-20260923.png`. |
| Publication action stays reachable | verified | An unpublished catalog receives a compact dock above the composer. It links to the exact missing product, fulfilment and tariff steps; the active publish button appears only when all three checks pass. |
| Publication failure is understandable | verified | The server action maps missing product, fulfilment, tariff and concurrent-update failures to specific Russian messages. |
| AI proposals do not create a second scrolling site inside AI Studio | verified | The storefront iframe and expandable full storefront were removed. Design results are a compact card with separate preview and explicit apply actions. |
| Mobile catalog product form is usable above navigation | verified | Variant rows use two columns on mobile, stock defaults to 1 for the first variant, quantity inputs have a visible `шт.` suffix, and the global mobile content reserve is 80 px. |
| New employee can keep the invitation through authentication | verified in code and database structure | Invitation URLs use `/staff/join?token=...`; login, Google redirect and email confirmation preserve the internal `next` route; unsafe redirects are rejected. Production has the `on_auth_user_created` trigger required to create the profile used after sign-up. |
| Employee invitation accepted by two separate live accounts | in progress | The corrected journey is implemented and builds, but creating a real invitation would mutate the owner's team. It will be tested with a disposable owner/employee pair after deployment if a production session is available. |
| Unusable Polar test checkout is hidden from sellers | verified | Production checkout requires `POLAR_LIVE_CHECKOUT_ENABLED=true` and refuses sandbox. Eight Polar configuration tests pass. Without the gate the plan page creates an explicit payment request and states that no money was charged. |
| Real Dukenim subscription charge and webhook | externally blocked | Polar's merchant screen reports test mode and unavailable payments. Business/payout activation, live product credentials and one real signed webhook are outside the codebase. The app deliberately does not claim payment. |
| Public route rendering and mobile width | verified | Clean production build followed by 62 local production-server checks across 31 public routes at 390 and 1440 px: all HTTP 200, zero JavaScript page errors and zero horizontal overflow. Cancelled speculative Next.js prefetches were ignored because the destination pages themselves returned 200. |
| Regression suite | verified | 96 test files / 484 tests pass; four live-AI tests remain explicitly skipped. Strict TypeScript and the 78-route production build pass. |

## Azure

Azure resources, model deployments, keys, quotas and spend were not changed. No new model call was required for this interface correction.

## Not completed

- A real Polar card charge and signed webhook cannot be completed until the merchant account is activated and live credentials are supplied.
- A physical iPhone performance measurement was not performed. The supplied iPhone screenshots were reproduced with a 390×844 browser viewport.
- A live employee acceptance by two separate authenticated accounts still needs a disposable production pair; the production owner team was not mutated for this check.
- SMS remains deferred as previously decided.

## Required owner action

For card subscription payments, finish Polar merchant/business and payout activation, create the live products and webhook, then perform one real payment. Only after that verification should `POLAR_LIVE_CHECKOUT_ENABLED=true` be set in Production.

## Where to verify

- Owner AI workspace: `/admin/ai-studio`
- Team and invitations: `/admin/team`, then the generated `/staff/join?token=...` link
- Tariff and safe payment request: `/admin/plan`
- Product form: `/admin/catalog/new`
- Public smoke routes: `/`, `/demo`, `/demo/food/assortment`, `/legal/privacy`
