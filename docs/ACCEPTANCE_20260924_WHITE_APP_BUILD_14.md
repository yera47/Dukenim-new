# Dukenim white identity — acceptance checklist

Date: 2026-09-24

| Requirement | Status | Evidence |
|---|---|---|
| Make the lower doorway threshold white | verified | Generated web/mobile symbol pixel at the threshold is `(255,255,255,255)`; the approved source and generated symbol alpha masks have no differences. |
| Replace the beige application background with white | verified | Shared mobile `stone` and `paper`, orders, settings, scanner permission view, splash, Android adaptive icon and orders widget canvas use `#FFFFFF`. |
| Apply the logo change on the website | verified | Vercel deployment `dpl_4kEvguGyeCFgZ2hGnwySATdLboRH` is Ready/current; production `/icon.svg` returns HTTP 200 and contains the white background and threshold. |
| Deliver the corrected iOS application | verified | EAS build `d00cc4d5-96c1-42ad-a6ed-36184a220ff0`, Dukenim `1.0.0 (14)`, is `VALID` and `IN_BETA_TESTING`; submission `5eee78c5-031b-4189-b6b4-ead18559df79`. |
| Confirm appearance on the owner's physical iPhone | externally blocked | TestFlight distribution is complete; the owner must update the app and visually accept the installed build. |

## Checks

- Mobile strict TypeScript: passed.
- Expo lint: passed.
- Expo Doctor: 21/21 passed.
- iOS Metro export: passed.
- Root strict TypeScript: passed.
- Next.js production build: 79 routes passed.
- Production SVG: HTTP 200 and white values verified.

## Azure

Unchanged. No model, deployment, key, quota, inference or cost changed.
