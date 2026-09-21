# Dukenim SMS connection

One platform Mobizon account serves buyer OTP and merchant messages. Stores do not enter provider API credentials.

1. Register the platform account with the legal owner, complete the provider agreement and approve the `DUKENIM` OTP Sender ID. Each store's own Sender ID requires separate approval before branded campaigns can be sent.
2. Put `MOBIZON_API_KEY` and `MOBIZON_OTP_SENDER_ID` in Vercel Production secrets. The OTP sender must be the approved name; never put either value in this repository or in AI context files.
3. In Supabase Authentication → Hooks, create a Send SMS HTTP hook for `https://www.dukenim.kz/api/auth/sms-hook`. Store the hook's Standard Webhooks signing secret in Vercel Production as `SUPABASE_SMS_HOOK_SECRET`. Redeploy before enabling the hook and Phone Auth. The endpoint rejects unsigned requests, old signatures, invalid phone/code data and carrier failures; it does not queue OTP for delayed delivery.
4. In Supabase Authentication → Providers, enable Phone only when the hook, approved sender and provider key are present. Keep automatic phone confirmation off. Request and receive one real OTP on an owner-controlled number, then set `BUYER_PHONE_AUTH_ENABLED=true` in Vercel Production and redeploy. Verify a buyer order and its history. Send one consented merchant-branded test message separately before marking campaigns ready.

Until that final switch is enabled, buyers can order with a contact phone and consent without creating an account. Their orders remain accessible through the browser's signed receipt/cookie. Unverified phone numbers cannot access an account's history or redeem a loyalty reward; do not advertise cross-device history until OTP has been tested.

Without the legal account, provider key and approved sender, the OTP hook returns 503 and does not send SMS. The campaign queue also remains unsent. Do not claim phone sign-in or branded SMS is live from a passing build or mock-provider test.
