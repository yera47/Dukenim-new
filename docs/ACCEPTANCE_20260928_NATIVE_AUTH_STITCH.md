# Dukenim iOS / Stitch acceptance — 2026-09-28

| Requirement | Status | Evidence / next check |
| --- | --- | --- |
| Google returns to native app | in progress | Supabase production redirect allowlist now includes `dukenim://auth-callback`; mobile OAuth uses that exact URL and PKCE. A fresh TestFlight login on the owner's iPhone is still required. |
| Email registration does not trap users waiting for a code | verified | Native registration now presents Google as primary and clearly states email registration is unavailable until mail delivery is configured; Stitch B/C remove code and disable unavailable email action. |
| Apple sign-in | externally blocked | Native code exists, but the Supabase Apple provider is not enabled and the mobile release flag stays off. Provider setup and physical-iPhone verification remain. |
| SMS sign-in | externally blocked | No verified sender, customer OTP delivery or accepted end-to-end journey. Do not present SMS as available. |
| Same store and setup progress on web and iOS | in progress | Existing `workspaceRoute` reads shared tenant and catalog state; native builder saves `catalog_builder_drafts` with revisions. Owner's cross-device journey remains unverified. |
| Segment-specific catalog choices | in progress | Native builder offers six food-format examples and recommends one of the two supported storefront layouts; non-food advice follows the selected vertical. Confirm a saved store on both devices. |
| Stitch minimal, truthful screens | verified | Project [Dukenim Merchant iOS Prototype](https://stitch.withgoogle.com/u/1/projects/835608249656701686?pli=1): registration B/C, readiness J and preview K visibly updated. K's publish action is disabled for zero products. It remains a prototype, not backend proof. |
| Brand and native interface | in progress | Platform accent is `#56334D` on white; approved D alpha geometry is unchanged and only the doorway threshold was recoloured. Verify on iPhone after installation. |
| Production website / TestFlight release | in progress | Local strict TypeScript, mobile lint, iOS Metro export and Next.js build pass. Deployment/build and device acceptance to follow. |

The Supabase redirect change was pushed through an isolated auth-only config file and verified with `config diff` showing zero auth updates. Do not push the repository's general `supabase/config.toml` to production: it declares local Postgres 15 while production is Postgres 17.

Azure: unchanged. No Azure resource or model was modified.
