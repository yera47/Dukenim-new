import "server-only";

// Enable only after the platform provider, Auth hook and a real OTP are verified.
export function phoneAuthReady() {
  return process.env.BUYER_PHONE_AUTH_ENABLED === "true"
    && Boolean(process.env.MOBIZON_API_KEY)
    && Boolean(process.env.MOBIZON_OTP_SENDER_ID)
    && Boolean(process.env.SUPABASE_SMS_HOOK_SECRET);
}
