# Dukenim Mobile

Native iOS/Android client for Dukenim, sharing Supabase Auth and RLS with the web platform.

## Local setup

1. Copy `.env.example` to `.env.local` and provide only the public Supabase URL and publishable key.
2. Run `pnpm start` from this directory.
3. Use Expo Go for device development. Store builds and APNs need a linked Expo/EAS project and Apple signing setup.

The app never accepts a Supabase service-role key, Polar credential, or other server secret.

## Current scope

Updated 2026-09-08: EAS project linked; Apple distribution certificate and active App Store provisioning profile created. No signed build or TestFlight upload verified. Production public environment and physical-device QA remain required. Expo Go does not replace signed-build/APNs validation.

- Email/password sign-in with the existing Supabase account.
- Owner/superadmin role recognition; root actions stay server-audited.
- Camera barcode scanning.
- Local notification permission and Android notification channel setup.

Push token registration and server outbox/delivery code exist, but production migrations/scheduling and delivery E2E are not confirmed. Widgets and native Apple/Google OAuth remain incomplete.

## Required order notifications (not yet delivered)

- Distinguish delivery, paid pickup and in-store reservation; payment status comes from verified backend events, never notification copy.
- Show order/reference number and fulfilment type; sensitive customer contact/address stays inside the authenticated app, not on the lock screen.
- Tap opens the correct order/reservation, rechecking current membership/permissions. Logout, revoked membership and disabled tokens must stop delivery.
- Notify from committed server events; deduplicate retries. Reservation confirmation/expiry/cancellation requires actual reservation lifecycle first.
- Check foreground/background/terminated states, denied permission, expired token, duplicate event and cross-tenant access on physical devices before release.
