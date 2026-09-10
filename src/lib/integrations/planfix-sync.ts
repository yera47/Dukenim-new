import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  createPlanfixContact,
  createPlanfixTask,
  PlanfixApiError,
  refreshPlanfixAccessToken,
  type CanonicalIntegrationOrder,
} from "./planfix";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "./secrets";

type AdminClient = SupabaseClient<Database>;
type StoredTokens = { accessToken: string; refreshToken: string };

type Connection = Database["public"]["Tables"]["integration_connections"]["Row"];
type EntityLink = Database["public"]["Tables"]["integration_entity_links"]["Row"];

const STALE_CLAIM_MS = 2 * 60_000;

function config() {
  const clientId = process.env.PLANFIX_CLIENT_ID?.trim();
  const clientSecret = process.env.PLANFIX_CLIENT_SECRET?.trim();
  const encryptionKey = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim();
  if (!clientId || !clientSecret || !encryptionKey) throw new Error("Planfix is not configured");
  return { clientId, clientSecret, encryptionKey };
}

async function activeConnection(client: AdminClient, tenantId: string) {
  const result = await client.from("integration_connections").select("*")
    .eq("tenant_id", tenantId).eq("provider", "planfix").eq("status", "active").maybeSingle();
  if (result.error) throw new Error("Planfix connection could not be read");
  if (!result.data) throw new Error("Planfix is not connected");
  return result.data;
}

export async function getPlanfixAccess(client: AdminClient, tenantId: string, now = new Date()) {
  const configured = config();
  let connection = await activeConnection(client, tenantId);
  let tokens = decryptIntegrationSecret<StoredTokens>(connection.token_ciphertext, configured.encryptionKey);
  if (!tokens.accessToken || !tokens.refreshToken) throw new Error("Planfix token record is invalid");

  if (new Date(connection.access_token_expires_at).getTime() > now.getTime() + 60_000) {
    return { connection, accessToken: tokens.accessToken };
  }

  let refreshed;
  try {
    refreshed = await refreshPlanfixAccessToken({
      clientId: configured.clientId,
      clientSecret: configured.clientSecret,
      refreshToken: tokens.refreshToken,
    });
  } catch {
    // Another request may have rotated the one-time refresh token first.
    connection = await activeConnection(client, tenantId);
    tokens = decryptIntegrationSecret<StoredTokens>(connection.token_ciphertext, configured.encryptionKey);
    if (new Date(connection.access_token_expires_at).getTime() > now.getTime() + 60_000) {
      return { connection, accessToken: tokens.accessToken };
    }
    throw new Error("Planfix authorization must be renewed");
  }

  const tokenCiphertext = encryptIntegrationSecret({
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
  }, configured.encryptionKey);
  const expiresAt = new Date(now.getTime() + refreshed.expiresIn * 1000).toISOString();
  const updated = await client.from("integration_connections").update({
    token_ciphertext: tokenCiphertext,
    access_token_expires_at: expiresAt,
    scopes: refreshed.scope.split(/\s+/).filter(Boolean),
    account_name: refreshed.accountName || connection.account_name,
    account_domain: refreshed.accountDomain,
    account_url: `https://${refreshed.accountDomain}`,
    safe_error: null,
    updated_at: now.toISOString(),
  }).eq("id", connection.id).eq("token_ciphertext", connection.token_ciphertext).select("*").maybeSingle();
  if (updated.error) throw new Error("Planfix token rotation could not be stored");
  if (!updated.data) {
    const winner = await activeConnection(client, tenantId);
    const winnerTokens = decryptIntegrationSecret<StoredTokens>(winner.token_ciphertext, configured.encryptionKey);
    return { connection: winner, accessToken: winnerTokens.accessToken };
  }
  return { connection: updated.data, accessToken: refreshed.accessToken };
}

async function claimEntity(input: {
  client: AdminClient;
  connection: Connection;
  entityType: "customer" | "order";
  entityId: string;
  sourceVersion: string;
  now: Date;
}): Promise<{ state: "claimed" | "synced" | "uncertain" | "busy"; link: EntityLink }> {
  const row = {
    tenant_id: input.connection.tenant_id,
    connection_id: input.connection.id,
    provider: "planfix" as const,
    entity_type: input.entityType,
    entity_id: input.entityId,
    source_version: input.sourceVersion,
    status: "syncing" as const,
    attempts: 1,
    claimed_at: input.now.toISOString(),
    updated_at: input.now.toISOString(),
  };
  const inserted = await input.client.from("integration_entity_links").insert(row).select("*").maybeSingle();
  if (!inserted.error && inserted.data) return { state: "claimed", link: inserted.data };
  if (inserted.error?.code !== "23505") throw new Error("Planfix synchronization state could not be created");

  const existing = await input.client.from("integration_entity_links").select("*")
    .eq("tenant_id", input.connection.tenant_id).eq("provider", "planfix")
    .eq("entity_type", input.entityType).eq("entity_id", input.entityId).maybeSingle();
  if (existing.error || !existing.data) throw new Error("Planfix synchronization state could not be read");
  if (existing.data.status === "synced") return { state: "synced", link: existing.data };
  if (existing.data.status === "uncertain") return { state: "uncertain", link: existing.data };
  if (existing.data.status === "syncing" && existing.data.claimed_at && input.now.getTime() - new Date(existing.data.claimed_at).getTime() < STALE_CLAIM_MS) {
    return { state: "busy", link: existing.data };
  }
  if (existing.data.status === "syncing") {
    const uncertain = await input.client.from("integration_entity_links").update({
      status: "uncertain",
      safe_error: "Предыдущая отправка прервалась. Проверьте Planfix перед повтором.",
      updated_at: input.now.toISOString(),
    }).eq("id", existing.data.id).select("*").single();
    if (uncertain.error) throw new Error("Planfix synchronization state could not be recovered");
    return { state: "uncertain", link: uncertain.data };
  }
  const retried = await input.client.from("integration_entity_links").update({
    status: "syncing",
    attempts: Math.min(existing.data.attempts + 1, 10),
    claimed_at: input.now.toISOString(),
    safe_error: null,
    source_version: input.sourceVersion,
    updated_at: input.now.toISOString(),
  }).eq("id", existing.data.id).eq("status", "failed").select("*").maybeSingle();
  if (retried.error) throw new Error("Planfix synchronization retry could not be claimed");
  return retried.data ? { state: "claimed", link: retried.data } : { state: "busy", link: existing.data };
}

async function finishLink(client: AdminClient, link: EntityLink, providerObjectId: number, now: Date) {
  const result = await client.from("integration_entity_links").update({
    status: "synced",
    provider_object_id: String(providerObjectId),
    synced_at: now.toISOString(),
    safe_error: null,
    updated_at: now.toISOString(),
  }).eq("id", link.id).eq("status", "syncing");
  if (result.error) throw new Error("Planfix synchronization result could not be stored");
}

async function failLink(client: AdminClient, link: EntityLink, error: unknown, now: Date) {
  const uncertain = error instanceof PlanfixApiError && error.outcomeUncertain;
  await client.from("integration_entity_links").update({
    status: uncertain ? "uncertain" : "failed",
    safe_error: uncertain
      ? "Planfix мог принять данные, но ответ не получен. Проверьте Planfix перед повтором."
      : "Planfix отклонил данные или временно недоступен.",
    updated_at: now.toISOString(),
  }).eq("id", link.id).eq("status", "syncing");
}

async function canonicalOrder(client: AdminClient, tenantId: string, orderId: string): Promise<CanonicalIntegrationOrder> {
  const order = await client.from("orders").select("*").eq("tenant_id", tenantId).eq("id", orderId).maybeSingle();
  if (order.error || !order.data) throw new Error("Order is not available");
  const [customer, items] = await Promise.all([
    order.data.customer_id
      ? client.from("customers").select("id,name,phone").eq("tenant_id", tenantId).eq("id", order.data.customer_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client.from("order_items").select("title_snapshot,price_snapshot,qty,variant_id").eq("tenant_id", tenantId).eq("order_id", orderId),
  ]);
  if (customer.error || items.error || !items.data?.length) throw new Error("Order details are not available");
  const variantIds = items.data.flatMap((item) => item.variant_id ? [item.variant_id] : []);
  const variants = variantIds.length
    ? await client.from("product_variants").select("id,sku").eq("tenant_id", tenantId).in("id", variantIds)
    : { data: [], error: null };
  if (variants.error) throw new Error("Order variants are not available");
  const sku = new Map((variants.data ?? []).map((variant) => [variant.id, variant.sku]));
  return {
    id: order.data.id,
    version: order.data.created_at,
    orderNumber: order.data.order_number,
    customerId: customer.data?.id ?? null,
    customerName: customer.data?.name?.trim() || "Покупатель Dukenim",
    customerPhone: customer.data?.phone ?? "не указан",
    deliveryMethod: order.data.delivery_method,
    deliveryAddress: order.data.delivery_address,
    paymentMethod: order.data.payment_method,
    paymentStatus: order.data.payment_status,
    subtotal: order.data.subtotal,
    deliveryCost: order.data.delivery_cost,
    total: order.data.total,
    currency: "KZT",
    items: items.data.map((item) => ({
      title: item.title_snapshot,
      sku: item.variant_id ? sku.get(item.variant_id) ?? null : null,
      quantity: item.qty,
      unitPrice: item.price_snapshot,
    })),
  };
}

export async function syncOrderToPlanfix(client: AdminClient, tenantId: string, orderId: string, now = new Date()) {
  const access = await getPlanfixAccess(client, tenantId, now);
  const order = await canonicalOrder(client, tenantId, orderId);
  let counterpartyId: number | undefined;

  if (order.customerId) {
    const contactClaim = await claimEntity({
      client,
      connection: access.connection,
      entityType: "customer",
      entityId: order.customerId,
      sourceVersion: order.version,
      now,
    });
    if (contactClaim.state === "uncertain") throw new Error("Planfix contact delivery must be checked manually");
    if (contactClaim.state === "busy") throw new Error("Planfix contact synchronization is already running");
    if (contactClaim.state === "synced") counterpartyId = Number(contactClaim.link.provider_object_id) || undefined;
    if (contactClaim.state === "claimed") {
      try {
        const created = await createPlanfixContact({
          accountDomain: access.connection.account_domain,
          accessToken: access.accessToken,
          order,
        });
        if (created) {
          counterpartyId = created.id;
          await finishLink(client, contactClaim.link, created.id, now);
        }
      } catch (error) {
        await failLink(client, contactClaim.link, error, now);
        throw error;
      }
    }
  }

  const taskClaim = await claimEntity({
    client,
    connection: access.connection,
    entityType: "order",
    entityId: order.id,
    sourceVersion: order.version,
    now,
  });
  if (taskClaim.state === "synced") return { state: "already_synced" as const, providerObjectId: taskClaim.link.provider_object_id };
  if (taskClaim.state === "uncertain") throw new Error("Planfix order delivery must be checked manually");
  if (taskClaim.state === "busy") throw new Error("Planfix order synchronization is already running");
  try {
    const created = await createPlanfixTask({
      accountDomain: access.connection.account_domain,
      accessToken: access.accessToken,
      order,
      counterpartyId,
    });
    await finishLink(client, taskClaim.link, created.id, now);
    await client.from("integration_connections").update({ last_sync_at: now.toISOString(), safe_error: null, updated_at: now.toISOString() })
      .eq("id", access.connection.id);
    return { state: "synced" as const, providerObjectId: String(created.id) };
  } catch (error) {
    await failLink(client, taskClaim.link, error, now);
    throw error;
  }
}
