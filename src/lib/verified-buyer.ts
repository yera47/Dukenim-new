import type { User } from "@supabase/supabase-js";

export function verifiedBuyer(user: User | null | undefined) {
  const phoneVerified = Boolean(user?.phone && user.phone_confirmed_at);
  const accountVerified = Boolean(!user?.is_anonymous && (phoneVerified || (user?.email && user.email_confirmed_at)));
  return { accountVerified, phoneVerified };
}
