# Dukenim iOS / Stitch acceptance — 2026-09-28

| Requirement | Status | Evidence / next check |
| --- | --- | --- |
| Google returns to native app | in progress | Supabase production redirect allowlist now includes `dukenim://auth-callback`; mobile OAuth uses that exact URL and PKCE. A fresh TestFlight login on the owner's iPhone is still required. |
| Email registration does not trap users waiting for a code | verified | Native registration now presents Google as primary and clearly states email registration is unavailable until mail delivery is configured; Stitch B/C remove code and disable unavailable email action. |
| Apple sign-in | externally blocked | Native code exists, but the Supabase Apple provider is not enabled and the mobile release flag stays off. Provider setup and physical-iPhone verification remain. |
| SMS sign-in | externally blocked | No verified sender, customer OTP delivery or accepted end-to-end journey. Do not present SMS as available. |
| Same store and setup progress on web and iOS | in progress | Existing `workspaceRoute` reads shared tenant and catalog state; native builder saves `catalog_builder_drafts` with revisions. Owner's cross-device journey remains unverified. |
| Segment-specific catalog choices | in progress | Native builder offers six food formats. Restaurant, canteen and doner suggest a fast menu; bakery, confectionery and coffee suggest a gallery. Both layouts now have distinct visual previews; the gallery preview was previously hidden by a case-sensitive check. Web example copy and AI consultation advice match. Confirm a saved store on both devices. |
| Stitch minimal, truthful screens | in progress | Project [Dukenim Merchant iOS Prototype](https://stitch.withgoogle.com/u/1/projects/835608249656701686?pli=1): B was visually inspected with Google primary and disabled email registration; C keeps existing email/password login. F maps six food formats to two templates. J/K block zero-product publishing, Integrations show unconfigured/manual states, and Clients, Stock, Analytics, Loyalty, Staff expose empty/default and labelled demo views. Whole-prototype visual and interaction audit remains. |
| Brand and native interface | in progress | Platform accent is `#56334D` on white; approved D alpha geometry is unchanged and only the doorway threshold was recoloured. Verify on iPhone after installation. |
| Production website / TestFlight release | in progress | Commit `ce2cf9c` is deployed Ready to production; `www.dukenim.kz/icon.svg` returned 200 with the new accent. Signed EAS iOS build 22 / submission `3fe0b745-862b-4f47-a534-03215a99daca` is `VALID` / `IN_BETA_TESTING` in App Store Connect. Physical-device acceptance to follow. |
| Autonomous continuation | verified | Existing `dukenim` thread heartbeat is ACTIVE hourly with a prompt to resume the same acceptance checklist, implement independently, run checks, publish authorized changes and report only concrete external blockers. A scheduled run cannot operate the owner's physical iPhone or complete provider verification on its own. |

The Supabase redirect change was pushed through an isolated auth-only config file and verified with `config diff` showing zero auth updates. Do not push the repository's general `supabase/config.toml` to production: it declares local Postgres 15 while production is Postgres 17.

Azure: unchanged. No Azure resource or model was modified.

The inspected historical sample sales, stock, customer, loyalty and staff screens now use explicit demo/empty states. Other screens and prototype links still require an end-to-end audit. Stitch does not change actual backend capabilities.

2026-09-28 iteration: mobile TypeScript and lint passed; iOS Expo export passed. Root TypeScript and Next.js production build passed. The catalog preview and back-navigation persistence fix have not yet been verified on a physical iPhone. Apple provider, email delivery and SMS delivery remain externally blocked; release gates remain closed.
