# AI Studio, employees, publication and payment acceptance — 2026-09-23

## Result

The mobile AI Studio was rebuilt as a bounded chat workspace based on the supplied reference package. The result keeps one scrollable conversation, a compact result card, a fixed composer, a fixed mobile navigation bar and a publication control beside the composer. The nested storefront iframe and the long settings stack were removed from the ready state.

Employee invitation links now use a query token that survives authentication. A valid invitation can create a confirmed employee account, sign it in and accept the scoped access in one action; the invitation email is checked server-side before account creation. Production checkout for the Dukenim subscription fails closed until a real Polar charge and signed webhook have been verified; while that external activation is incomplete, the owner receives a clear tariff payment request instead of being sent to the unusable Polar test checkout.

## Acceptance checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| AI Studio matches the supplied mobile structure | verified | Production Playwright at 390×844 and 1440×844: three quick actions, no iframe, no horizontal overflow, no document scroll; composer and full-width light navigation do not overlap. Capture: `output/production-ai-studio-final-390-20260923.png`. |
| Publication action stays reachable | verified | A disposable production owner completed onboarding, created a product with stock 1 and saw the pinned ready dock above the composer. Its publish action changed `catalog_published` to true and the new public storefront returned HTTP 200 with the created product. |
| Publication failure is understandable | verified | The server action maps missing product, fulfilment, tariff and concurrent-update failures to specific Russian messages. |
| AI proposals do not create a second scrolling site inside AI Studio | verified | The storefront iframe and expandable full storefront were removed. Design results are a compact card with separate preview and explicit apply actions. |
| Mobile catalog product form is usable above navigation | verified | Variant rows use two columns on mobile, stock defaults to 1 for the first variant, quantity inputs have a visible `шт.` suffix, and the global mobile content reserve is 80 px. |
| New employee can keep the invitation through authentication | verified | Invitation URLs use `/staff/join?token=...`; login and Google redirect preserve the internal `next` route and unsafe redirects are rejected. A valid token is hashed and checked against its email, expiry and state before account creation. |
| Employee invitation accepted by two separate live accounts | verified | A disposable production owner created a manager invitation. A separate browser created the employee account, landed on `/staff`, saw `QA менеджер` and `Заказы`, and the owner page showed the new member. The staff page had zero horizontal overflow at 390 px. Direct database inspection confirmed a verified Auth user and active scoped `staff_access`. Exact cleanup left 0 QA users, tenants, invitations, staff rows and Storage objects. |
| Unusable Polar test checkout is hidden from sellers | verified | Production checkout requires `POLAR_LIVE_CHECKOUT_ENABLED=true` and refuses sandbox. Eight Polar configuration tests pass. Without the gate the plan page creates an explicit payment request and states that no money was charged. |
| Real Dukenim subscription charge and webhook | externally blocked | Polar's merchant screen reports test mode and unavailable payments. Business/payout activation, live product credentials and one real signed webhook are outside the codebase. The app deliberately does not claim payment. |
| Public route rendering and mobile width | verified | Clean production build and a production-origin check across 31 public routes at 390 and 1440 px: 62/62 HTTP 200, zero JavaScript page errors and zero horizontal overflow. Maximum measured TTFB was 876 ms, mobile maximum 522 ms. |
| Regression suite | verified | 96 test files / 484 tests pass; four live-AI tests remain explicitly skipped. Strict TypeScript and the 78-route production build pass. |

## Azure

Azure resources, model deployments, keys, quotas and spend were not changed. No new model call was required for this interface correction.

## Not completed

- A real Polar card charge and signed webhook cannot be completed until the merchant account is activated and live credentials are supplied.
- A physical iPhone performance measurement was not performed. The supplied iPhone screenshots were reproduced with a 390×844 browser viewport.
- SMS remains deferred as previously decided.

## Required owner action

For card subscription payments, finish Polar merchant/business and payout activation, create the live products and webhook, then perform one real payment. Only after that verification should `POLAR_LIVE_CHECKOUT_ENABLED=true` be set in Production.

## Where to verify

- Owner AI workspace: `/admin/ai-studio`
- Team and invitations: `/admin/team`, then the generated `/staff/join?token=...` link
- Tariff and safe payment request: `/admin/plan`
- Product form: `/admin/catalog/new`
- Public smoke routes: `/`, `/demo`, `/demo/food/assortment`, `/legal/privacy`

Production source release: commits `9d71e42`, `56c1805` and `5ef387a`; Vercel deployment `dpl_BcXFxhkPUTJVDvdtoAwizNooSdDP` is Ready and aliased to `www.dukenim.kz`.
