# Dukenim Mobile

Native iOS/Android client for Dukenim, sharing Supabase Auth and RLS with the web platform.

## Local setup

1. Copy `.env.example` to `.env.local` and provide only the public Supabase URL and publishable key.
2. Run `pnpm start` from this directory.
3. Use Expo Go for device development. Store builds and APNs need a linked Expo/EAS project and Apple signing setup.

The app never accepts a Supabase service-role key, Polar credential, or other server secret.

## Current scope

- Email/password sign-in with the existing Supabase account.
- Owner/superadmin role recognition; root actions stay server-audited.
- Camera barcode scanning.
- Local notification permission and Android notification channel setup.

Push token registration, delivery, iOS widgets, and native Apple/Google OAuth require the next secure backend and EAS configuration step. They are intentionally not represented as live features until that server path is complete.
