import "server-only";
import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription.js";
import type { Order } from "@polar-sh/sdk/models/components/order.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { planFromPolarProductId } from "@/lib/polar";
import type { Json } from "@/types/database";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function metadataTenantId(metadata: Record<string, unknown> | undefined): string | null {
  const value = metadata?.tenantId;
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
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

  if (event.type === "order.paid") {
    const order = event.data as Order;
    const topUpProductId = process.env.POLAR_AI_CREDIT_TOPUP_PRODUCT_ID?.trim();
    if (!topUpProductId || order.productId !== topUpProductId) {
      // Not the AI-credit top-up product (or top-up not configured) — never grant credits for it.
      await recordIgnoredEvent(eventId, event.type, payload);
      return NextResponse.json({ received: true, ignored: true });
    }
    const grant = Number(process.env.AI_CREDIT_TOPUP_GRANT ?? 50);
    const { data, error } = await createAdminClient().rpc("grant_purchased_ai_credits", {
      p_event_id: eventId,
      p_event_type: event.type,
      p_payload: payload,
      p_tenant_id: metadataTenantId(order.metadata),
      p_order_id: order.id,
      p_credits: grant,
      p_amount_kzt: Math.round(order.totalAmount / 100),
    });
    if (error) {
      console.error("Polar credit top-up failed", { eventId, code: error.code });
      return NextResponse.json({ error: "Failed to apply Polar event" }, { status: 500 });
    }
    return NextResponse.json({ received: true, duplicate: data === false });
  }

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
    p_tenant_id: metadataTenantId(subscription.metadata),
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
