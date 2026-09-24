# Dukenim visible threshold — acceptance checklist

Date: 2026-09-24

| Requirement | Status | Evidence |
|---|---|---|
| Keep the logo black and white with a visible blue threshold | verified | D body remains ink, canvas remains `#FFFFFF`, and only the exact lower threshold is medium navy `#315F78`. |
| Use a navy that is visible but not nearly black or cyan | verified | Active brand accent is `#315F78`; the deeper companion is `#274B60`. Former active `#173B57` values were replaced in web/mobile source. |
| Preserve the approved D construction | verified | Generated symbol and approved source have no alpha-mask differences. |
| Publish the website | verified | Vercel `dpl_7iAAEXKj45CiF4pRwXvFYUQphAn4` is Ready/current; production SVG returned HTTP 200 with `#315F78` and `#FFFFFF`. |
| Deliver the corrected iOS application | verified | EAS build `7986d60f-b924-4f5e-867e-d1c12a0c31fa`, Dukenim `1.0.0 (15)`, is `VALID` and `IN_BETA_TESTING`. |
| Confirm appearance on the owner's physical iPhone | externally blocked | TestFlight distribution is complete; the installed build requires visual acceptance by the owner. |

## Checks

- Mobile strict TypeScript: passed.
- Expo lint: passed.
- Expo Doctor: 21/21 passed.
- iOS Metro export: passed.
- Root strict TypeScript: passed.
- Next.js production build: 79 routes passed.
- Production SVG: HTTP 200 and expected colours verified.

## Azure

Unchanged. No model, deployment, key, quota, inference or cost changed.
