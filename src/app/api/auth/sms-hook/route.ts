import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyStandardWebhook } from "@/lib/standard-webhook";

export const runtime = "nodejs";
export const maxDuration = 10;

const hookEvent = z.object({
  user: z.object({ phone: z.string().regex(/^\+7\d{10}$/) }),
  sms: z.object({ otp: z.string().regex(/^\d{6,8}$/) }),
});

export async function POST(request: Request) {
  const secret = process.env.SUPABASE_SMS_HOOK_SECRET;
  const apiKey = process.env.MOBIZON_API_KEY;
  const sender = process.env.MOBIZON_OTP_SENDER_ID;
  // Keep Phone Auth closed until the platform account and sender are ready.
  if (!secret || !apiKey || !sender || !/^[A-Za-z0-9]{3,11}$/.test(sender)) {
    return NextResponse.json({ error: "SMS authentication is not configured" }, { status: 503 });
  }
  const raw = await request.text();
  if (raw.length > 16_000 || !verifyStandardWebhook(request.headers, raw, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let event: z.infer<typeof hookEvent>;
  try {
    event = hookEvent.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Invalid SMS event" }, { status: 400 });
  }
  const params = new URLSearchParams({
    recipient: event.user.phone,
    text: `Код входа Dukenim: ${event.sms.otp}. Никому не сообщайте код.`,
    from: sender,
  });
  try {
    const response = await fetch(`https://api.mobizon.kz/service/message/sendsmsmessage?apiKey=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: params.toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    const payload = await response.json() as { code?: number; data?: { messageId?: string } };
    if (!response.ok || payload.code !== 0 || !payload.data?.messageId) throw new Error("provider rejected");
    return new Response(null, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "SMS delivery failed" }, { status: 502 });
  }
}
