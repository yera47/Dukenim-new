# Dukenim Mobile

Native iPhone owner app for Dukenim. It uses the same Supabase Auth, tenant membership and RLS rules as the web platform.

## Local setup

1. Copy `.env.example` to `.env.local` and provide only the public Supabase URL and publishable key.
2. Run `pnpm start` from this directory.
3. Use Expo Go for development. App Store builds, APNs and TestFlight use the linked EAS project.

The app never accepts a Supabase service-role key, Apple password, Polar credential or another server secret.

## Current scope

- Email/password sign-in with the existing Dukenim account.
- Owner and superadmin role recognition.
- Native home, RLS-scoped order list and order detail.
- Camera barcode scanning.
- Push-token registration, rotation handling and order deep links.
- Foreground notification banners, list entries and sound.
- Settings with notification control and links to the web cabinet, support, privacy policy and public offer.

The signed production app uses bundle ID `kz.dukenim.app`. Build 7 uses the exact approved D geometry with only its lower threshold coloured blue and keeps the compact in-app mark at its original visual size. EAS Metadata is kept in `store.config.json`, and `.eas/workflows/submit-latest-ios.yml` can upload the latest production build after an explicit workflow approval. The upload still requires a one-time App Store Connect authentication or API key.

## Release verification

Before App Review, install through TestFlight on a physical iPhone and verify sign-in, tenant isolation, order list/detail, notification delivery in foreground/background/terminated states, deep links, camera permission and scanner behavior. App privacy answers, review contact details, screenshots and a review demo account must use approved owner/business information.
