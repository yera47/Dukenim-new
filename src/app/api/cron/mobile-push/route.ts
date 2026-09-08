import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { expoAccepted } from "@/lib/expo-push-result";

export const maxDuration = 60;


function retryAt(attempts: number) {
  return new Date(Date.now() + Math.min(30, 5 * attempts) * 60_000).toISOString();
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createAdminClient();
  const now = new Date().toISOString();
  const { data: pending, error } = await client
    .from("mobile_notification_outbox")
    .select("id, tenant_id, user_id, title, body, data, attempts")
    .eq("status", "pending")
    .lte("deliver_after", now)
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) return NextResponse.json({ error: "Unable to read mobile notification queue" }, { status: 500 });

  let sent = 0;
  let failed = 0;

  for (const notification of pending ?? []) {
    const { data: claimed } = await client
      .from("mobile_notification_outbox")
      .update({ status: "processing" })
      .eq("id", notification.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    try {
      const member=await client.from("tenant_users").select("id").eq("tenant_id",notification.tenant_id).eq("user_id",notification.user_id).eq("role","owner").maybeSingle();
      if(member.error||!member.data)throw new Error("Recipient access unavailable");
      const { data: devices, error: deviceError } = await client
        .from("mobile_device_tokens")
        .select("token")
        .eq("user_id", notification.user_id)
        .eq("enabled", true);
      if (deviceError) throw deviceError;

      if (!devices?.length) {
        throw new Error("No registered device");
      }

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(devices.map((device) => ({
          to: device.token,
          sound: "default",
          title: notification.title,
          body: notification.body,
          data: notification.data,
          channelId: "orders",
          priority: "high",
        }))),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const payload:unknown = await response.json().catch(() => ({}));
      if (!response.ok || !expoAccepted(payload,devices.length)) {
        throw new Error("Expo did not acknowledge all messages");
      }

      await client.from("mobile_notification_outbox").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).eq("id", notification.id);
      sent += 1;
    } catch {
      const attempts = notification.attempts + 1;
      const message = "Push delivery not confirmed; inspect device registration and provider configuration";
      await client.from("mobile_notification_outbox").update(
        attempts >= 3
          ? { status: "failed", attempts, last_error: message }
          : { status: "pending", attempts, deliver_after: retryAt(attempts), last_error: message },
      ).eq("id", notification.id);
      failed += 1;
    }
  }

  // 'sent' in the legacy database means accepted by Expo, not received by a phone.
  return NextResponse.json({ ok: true, processed: (pending ?? []).length, acceptedByExpo:sent, failed });
}
