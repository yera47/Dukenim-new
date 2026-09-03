import "server-only";
import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { planFromPolarProductId } from "@/lib/polar";
import type { Database } from "@/types/database";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

type SubscriptionPayload = {
  id: string;
  status: string;
  customerId: string;
  productId: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, unknown>;
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

async function resolveTenantId(client: SupabaseAdmin, sub: SubscriptionPayload): Promise<string | null> {
  const fromMetadata = typeof sub.metadata?.tenantId === "string" ? sub.metadata.tenantId : null;
  if (fromMetadata) return fromMetadata;
  const { data } = await client.from("tenants").select("id").eq("polar_customer_id", sub.customerId).maybeSingle();
  return data?.id ?? null;
}

async function syncSubscription(client: SupabaseAdmin, sub: SubscriptionPayload) {
  const tenantId = await resolveTenantId(client, sub);
  if (!tenantId) return;

  const plan = planFromPolarProductId(sub.productId) ?? "standard";
  const active = ACTIVE_STATUSES.has(sub.status);

  await client.from("tenants").update({ polar_customer_id: sub.customerId, ...(active ? { plan, status: "active" as const } : {}) }).eq("id", tenantId);

  const subscriptionRow: Database["public"]["Tables"]["subscriptions"]["Insert"] = {
    tenant_id: tenantId,
    plan,
    status: active ? "active" : "canceled",
    started_at: new Date().toISOString(),
    current_period_end: sub.currentPeriodEnd.toISOString(),
    polar_subscription_id: sub.id,
    polar_product_id: sub.productId,
    cancel_at_period_end: Boolean(sub.cancelAtPeriodEnd),
  };
  await client.from("subscriptions").upsert(subscriptionRow, { onConflict: "polar_subscription_id" });
}

async function revokeSubscription(client: SupabaseAdmin, sub: SubscriptionPayload) {
  const tenantId = await resolveTenantId(client, sub);
  await client.from("subscriptions").update({ status: "canceled" }).eq("polar_subscription_id", sub.id);
  if (tenantId) await client.from("tenants").update({ status: "paused" as const }).eq("id", tenantId);
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
    throw error;
  }

  const client = createAdminClient();
  const deliveryId = headers["webhook-id"] || `${event.type}:${JSON.stringify(event.data).slice(0, 200)}`;

  // Idempotency: a duplicate delivery id (Polar retries, or a re-sent webhook) hits the
  // unique constraint on event_id and is skipped without reapplying the event.
  const { error: insertError } = await client.from("polar_webhook_events").insert({ event_id: deliveryId, event_type: event.type, payload: event as unknown as Database["public"]["Tables"]["polar_webhook_events"]["Row"]["payload"] });
  if (insertError) {
    if (insertError.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    return NextResponse.json({ error: "Failed to record webhook delivery" }, { status: 500 });
  }

  switch (event.type) {
    case "subscription.created":
    case "subscription.updated":
    case "subscription.active":
    case "subscription.uncanceled":
      await syncSubscription(client, event.data as unknown as SubscriptionPayload);
      break;
    case "subscription.canceled":
      // Still active until current_period_end; only the auto-renew flag changes.
      await client.from("subscriptions").update({ cancel_at_period_end: true }).eq("polar_subscription_id", (event.data as { id: string }).id);
      break;
    case "subscription.revoked":
      await revokeSubscription(client, event.data as unknown as SubscriptionPayload);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
