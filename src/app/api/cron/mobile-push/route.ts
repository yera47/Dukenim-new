import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

type ExpoTicket = { status?: string; message?: string };
type ExpoResponse = { data?: ExpoTicket[] };

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
    .select("id, user_id, title, body, data, attempts")
    .eq("status", "pending")
    .lte("deliver_after", now)
    .order("created_at", { ascending: true })
    .limit(25);

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
      const { data: devices, error: deviceError } = await client
        .from("mobile_device_tokens")
        .select("token")
        .eq("user_id", notification.user_id)
        .eq("enabled", true);
      if (deviceError) throw deviceError;

      if (!devices?.length) {
        await client.from("mobile_notification_outbox").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", notification.id);
        sent += 1;
        continue;
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
      });
      const payload = await response.json().catch(() => ({})) as ExpoResponse;
      if (!response.ok || !payload.data?.every((ticket) => ticket.status === "ok")) {
        throw new Error(payload.data?.find((ticket) => ticket.message)?.message ?? `Expo push returned HTTP ${response.status}`);
      }

      await client.from("mobile_notification_outbox").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).eq("id", notification.id);
      sent += 1;
    } catch (cause) {
      const attempts = notification.attempts + 1;
      const message = cause instanceof Error ? cause.message.slice(0, 500) : "Unknown delivery error";
      await client.from("mobile_notification_outbox").update(
        attempts >= 3
          ? { status: "failed", attempts, last_error: message }
          : { status: "pending", attempts, deliver_after: retryAt(attempts), last_error: message },
      ).eq("id", notification.id);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, processed: (pending ?? []).length, sent, failed });
}
