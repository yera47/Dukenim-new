import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { smsClient } from "@/lib/sms-db";
import { authorizeWorker } from "@/lib/push-worker-auth";

export const maxDuration = 60;
type MobizonResponse = { code?: number; data?: { messageId?: string } };

async function sendSms(row: { recipient: string; sender_id: string; body: string }) {
  const key = process.env.MOBIZON_API_KEY;
  if (!key) throw new Error("SMS provider is not configured");
  const params = new URLSearchParams({ recipient: row.recipient, text: row.body, from: row.sender_id });
  const response = await fetch(`https://api.mobizon.kz/service/message/sendsmsmessage?apiKey=${encodeURIComponent(key)}`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: params.toString(), cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  let payload: MobizonResponse = {};
  try { payload = await response.json() as MobizonResponse; } catch {}
  if (!response.ok || payload.code !== 0 || !payload.data?.messageId) throw new Error("SMS provider rejected message");
  return payload.data.messageId;
}

export async function GET(request: NextRequest) {
  if (!authorizeWorker(request.headers, process.env.CRON_SECRET, "sms")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Keep queued messages untouched until the external provider is configured.
  if (!process.env.MOBIZON_API_KEY) return NextResponse.json({ error: "SMS provider is not configured" }, { status: 503 });
  const db = smsClient(createAdminClient());
  const recovery = await db.from("sms_outbox").update({ status: "failed", last_error: "Sender interrupted; delivery outcome unknown" }).eq("status", "processing").lt("claimed_at", new Date(Date.now() - 120_000).toISOString());
  if (recovery.error) return NextResponse.json({ error: "Queue recovery failed" }, { status: 503 });
  const pending = await db.from("sms_outbox").select("*").eq("status", "pending").lte("deliver_after", new Date().toISOString()).order("created_at").limit(20);
  if (pending.error) return NextResponse.json({ error: "Queue unavailable" }, { status: 503 });
  let sent = 0, failed = 0;
  for (const row of pending.data ?? []) {
    const claim = await db.from("sms_outbox").update({ status: "processing", claimed_at: new Date().toISOString() }).eq("id", row.id).eq("status", "pending").select("id").maybeSingle();
    if (!claim.data) continue;
    try {
      const messageId = await sendSms(row);
      await db.from("sms_outbox").update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: messageId, last_error: null }).eq("id", row.id).eq("status", "processing");
      sent++;
    } catch (error) {
      const attempts = Math.min(3, row.attempts + 1);
      await db.from("sms_outbox").update({ status: attempts >= 3 ? "failed" : "pending", attempts, deliver_after: new Date(Date.now() + attempts * 5 * 60_000).toISOString(), last_error: error instanceof Error ? error.message : "SMS delivery failed" }).eq("id", row.id).eq("status", "processing");
      failed++;
    }
  }
  return NextResponse.json({ ok: true, sent, failed }, { headers: { "Cache-Control": "no-store" } });
}
