const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A push payload never supplies a URL or authorizes access to an order. */
export function notificationTarget(data: unknown): { orderId: string; tenantId: string } | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  if (typeof value.orderId !== "string" || !uuid.test(value.orderId)
    || typeof value.tenantId !== "string" || !uuid.test(value.tenantId)) return null;
  return { orderId: value.orderId, tenantId: value.tenantId };
}
