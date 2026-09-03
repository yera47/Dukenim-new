import "server-only";
import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { planFromPolarProductId } from "@/lib/polar";
import type { Json } from "@/types/database";

function metadataTenantId(subscription: Subscription): string | null {
  const value = subscription.metadata?.tenantId;
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

async function recordIgnoredEvent(eventId: string, eventType: string, payload: Json) {
  const { error } = await createAdminClient()
    .from("polar_webhook_events")
    .insert({ event_id: eventId, event_type: eventType, payload });
  if (error && error.code !== "23505") throw error;
}

export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Polar webhook is not configured" }, { status: 503 });

  const body = await request.text();
  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(body, headers, secret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    return NextResponse.json({ error: "Invalid Polar event" }, { status: 400 });
  }

  const eventId = headers["webhook-id"];
  if (!eventId) return NextResponse.json({ error: "Missing webhook id" }, { status: 400 });
  const payload = event as unknown as Json;

  if (!event.type.startsWith("subscription.")) {
    await recordIgnoredEvent(eventId, event.type, payload);
    return NextResponse.json({ received: true, ignored: true });
  }

  const subscription = event.data as Subscription;
  const plan = planFromPolarProductId(subscription.productId);
  if (!plan) {
    // A signed event for an unrelated Polar product must never grant Dukenim access.
    await recordIgnoredEvent(eventId, event.type, payload);
    return NextResponse.json({ received: true, ignored: true });
  }

  const { data, error } = await createAdminClient().rpc("process_polar_subscription_event", {
    p_event_id: eventId,
    p_event_type: event.type,
    p_payload: payload,
    p_tenant_id: metadataTenantId(subscription),
    p_customer_id: subscription.customerId,
    p_subscription_id: subscription.id,
    p_product_id: subscription.productId,
    p_plan: plan,
    p_subscription_status: subscription.status,
    p_period_start: subscription.currentPeriodStart?.toISOString() ?? null,
    p_period_end: subscription.currentPeriodEnd?.toISOString() ?? null,
    p_cancel_at_period_end: subscription.cancelAtPeriodEnd,
  });

  if (error) {
    console.error("Polar webhook transaction failed", { eventId, eventType: event.type, code: error.code });
    return NextResponse.json({ error: "Failed to apply Polar event" }, { status: 500 });
  }

  return NextResponse.json({ received: true, duplicate: data === false });
}
