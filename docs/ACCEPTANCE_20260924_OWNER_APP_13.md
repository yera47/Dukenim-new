# Dukenim iOS owner app build 13 — acceptance checklist

Date: 2026-09-24

| Requirement | Status | Evidence |
|---|---|---|
| Replace the two-card owner shell with a clear business cabinet | verified | `apps/mobile/src/app/index.tsx` shows store metrics and Catalog, Orders, AI Studio, Stock, Customers, Team, Analytics, Scanner, Delivery/Payment, Store Preview, Settings and Root for a superadmin. iOS Metro export and signed EAS build pass. |
| Create and view catalog items in the app | verified | `apps/mobile/src/app/catalog.tsx` reads RLS-scoped stores, products and variants; `product-new.tsx` validates and calls the production `create_product_with_variants` RPC, which enforces tenant membership and writes opening stock through `stock_movements`. No synthetic production product was created. |
| Preserve the approved D geometry and remove cyan | verified | `build_current_brand_assets.py` still derives every raster from the approved alpha silhouette and recolours only the doorway threshold to `#173B57`. The generated iOS icon was inspected; production `/icon.svg` contains the unchanged path and the navy threshold. |
| Apply the navy identity to the website | verified | Shared `--accent-bright` is `#173B57`; web icon/social/current symbol exports were regenerated. Vercel deployment `dpl_7d9bVjFPQ7Rj3R2giEv44WRCBf8G` is Ready/current on `dukenim.kz`. |
| Build and distribute the corrected iOS app | verified | EAS build `9772b695-ddeb-41f9-be6f-b2e5b9098c2f`, version `1.0.0 (13)`, finished and produced a signed IPA. Submission `5ab4fb56-4ec6-406d-86f7-e25cfd53e894` is `VALID` and `IN_BETA_TESTING`. |
| Validate the new screens on the owner's physical iPhone | externally blocked | Apple distribution is complete, but installation/update, authenticated catalog display, one real product save, push, widget and camera require the owner's iPhone. |

## Checks

- Mobile strict TypeScript: passed.
- Expo lint: passed.
- Expo Doctor: 21/21 passed.
- iOS Metro export: passed.
- Root strict TypeScript: passed.
- Next.js production build: 79 routes passed.
- Public production icon: HTTP response contains threshold `#173B57`.

## Azure

Unchanged. No model, deployment, key, quota, inference or cost changed.