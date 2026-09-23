# Dukenim iOS owner app — acceptance 2026-09-23

## Result

The first signed production iOS build of the Dukenim owner application exists. EAS build `90742768-52d6-4837-9608-0181d0e7977f` finished successfully as app version `1.0.0`, build `3`, bundle `kz.dukenim.app`, using the existing Apple Team, distribution certificate and active App Store provisioning profile.

## Acceptance checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| Reuse the existing Apple/EAS project | verified | EAS project `@yersat47/dukenim`, project ID `0d65ce93-0cbd-403c-abd1-03f2d6906da4`; Apple signing accepted for Team `NW7BN297KZ`. |
| Production backend configuration | verified | Public Supabase URL, publishable key and EAS project ID are stored in the EAS `production` environment. No service-role or private provider secret is bundled. |
| Owner sign-in | verified in source/build | Existing Supabase email/password session flow is included. Empty input and authentication failures have controlled Russian copy. A physical-device sign-in has not yet been run. |
| Native owner orders list | verified in source/build | `/orders` loads only stores associated with the signed-in user, then their last 100 RLS-filtered orders; includes filters, pull-to-refresh, empty/error states and links to order details. |
| Push/deep-link order opening | verified in source/build | Existing notification response routing opens `/order` with `orderId` and `tenantId`; the production bundle compiled it successfully. Live APNs delivery still needs a device acceptance run. |
| Barcode scanner | verified in source/build | Existing Expo Camera scanner remains included with the narrow camera permission copy. Physical camera acceptance is pending. |
| Expo dependency health | verified | `npx expo-doctor` passed 21/21 after aligning all Expo SDK 57 patch versions. |
| Static and bundle checks | verified | `npx tsc --noEmit`, `npx expo lint` and `npx expo export --platform ios` passed. |
| Signed App Store IPA | verified | EAS production build finished and produced an IPA artifact. |
| TestFlight upload | externally blocked | EAS needs complete App Store Connect credentials. The saved CLI Apple session expired; non-interactive submission cannot create an App Store Connect API key. |

## Apple and TestFlight

- App Store Connect app ID: `6808542651`.
- The ID is now stored as `submit.production.ios.ascAppId` in `apps/mobile/eas.json`.
- The signed IPA is available from the EAS build page: `https://expo.dev/accounts/yersat47/projects/dukenim/builds/90742768-52d6-4837-9608-0181d0e7977f`.
- No public App Store release or App Review submission was performed.

## Required owner action

Sign in to App Store Connect in the browser tab left open for this task. Do not send the password or two-factor code in chat. Once the browser/CLI Apple session is restored, rerun EAS Submit for build `90742768-52d6-4837-9608-0181d0e7977f`, then complete a physical iPhone pass for sign-in, order list, order deep link, push notification and scanner.

## Azure

Azure resources, model deployments, quota and spend were not used or changed.
