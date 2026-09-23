# Dukenim iOS owner app — acceptance 2026-09-23

## Result

The native owner application is prepared as an App Store production build. Final build `7` completed successfully with the exact brandbook D geometry, a dark main form and blue lower threshold. It preserves the system-icon safe area while using an unpadded compact mark at the original visual size inside the app.

## Acceptance checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| Reuse the existing Apple/EAS project | verified | EAS project `@yersat47/dukenim`, project ID `0d65ce93-0cbd-403c-abd1-03f2d6906da4`; Apple signing accepted for Team `NW7BN297KZ`. |
| Production backend configuration | verified | Public Supabase URL, publishable key and EAS project ID are stored in the EAS `production` environment. No service-role or private provider secret is bundled. |
| Owner sign-in and recovery | verified in source/build | Existing Supabase email/password flow, controlled Russian errors, Enter submission, registration and recovery links are included. Physical-device acceptance remains pending. |
| Native owner orders | verified in source/build | `/orders` loads the signed-in user's tenant memberships and last 100 RLS-filtered orders, with filters, refresh, empty/error states and detail links. |
| Push lifecycle | verified in source/build | Device tokens are owner-scoped, token rotation disables the previous token, foreground notifications render banners/list/sound, and taps route to the requested order after auth. Live APNs delivery still requires an iPhone. |
| Barcode scanner | verified in source/build | Expo Camera scanner and camera permission are enabled in the iOS configuration. Physical camera acceptance remains pending. |
| App icon and launch assets | verified in source and signed build 7 | The previous redrawn SVG was removed. The 1024 px iOS icon, transparent splash/adaptive mark, compact in-app login mark and shared web logo now use the exact alpha/geometry of `dukenim-flat-symbol.png`; only the lower threshold is blue. An automated pixel comparison reports 0 alpha-mask mismatches. |
| Public support URL | verified locally | `/support` exists, passed the production build and returned HTTP 200 from the local production server. Publishing the web change still requires a web release. |
| App Store metadata | verified | `store.config.json` contains RU/en-US descriptions, category, URLs, age rating and manual release; `eas metadata:lint --profile production` returned no errors. |
| Repeatable TestFlight upload | verified in configuration | `.eas/workflows/submit-latest-ios.yml` validates and selects the latest production iOS build, requires approval, then submits it with release notes. |
| Static and bundle checks | verified | Mobile TypeScript, Expo lint, Expo Doctor 21/21 and iOS Metro export pass. Root TypeScript and the 79-page production web build pass. |
| Signed App Store IPA | verified | Final production build `d8f33f37-081d-4f99-b37d-fe92462218e8` finished successfully as app `1.0.0`, build `7`, bundle `kz.dukenim.app`, and produced the signed IPA. |
| TestFlight upload | externally blocked | The saved Apple CLI session expired. Non-interactive EAS Submit needs an App Store Connect API key or one interactive Apple authentication. |

## Apple and TestFlight

- Bundle ID: `kz.dukenim.app`.
- App Store Connect app ID: `6808542651`.
- Completed fallback build: `https://expo.dev/accounts/yersat47/projects/dukenim/builds/90742768-52d6-4837-9608-0181d0e7977f`.
- Previous signed fallback: `https://expo.dev/accounts/yersat47/projects/dukenim/builds/d6c54c96-597a-43e0-b3f5-e8246b49eacd`.
- Corrected-logo fallback build 6: `https://expo.dev/accounts/yersat47/projects/dukenim/builds/04eb158c-4d37-45f7-817b-8fccd06c3578`.
- Final build 7: `https://expo.dev/accounts/yersat47/projects/dukenim/builds/d8f33f37-081d-4f99-b37d-fe92462218e8`.
- Final signed IPA artifact: `https://expo.dev/artifacts/eas/I8FaJYpd2u4ex6e0RNMiUN5lR1JTIcF7NyzSBPBaOMk.ipa`.
- No App Review or public App Store release was performed.

## Required owner action

When access to Apple is available, authenticate once in App Store Connect or create an App Store Connect API key and save it in EAS. Do not send passwords or two-factor codes in chat. Then run the validated EAS workflow, wait for Apple processing and install the build through TestFlight.

Before App Review, provide approved business/legal data for App Privacy, review contact phone, screenshots and a review account. Run the device checklist for sign-in, RLS order visibility, push delivery/deep link and camera scanning.

## Azure

Azure resources, model deployments, quota and spend were not used or changed.
