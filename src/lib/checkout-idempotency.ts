const KEY_PREFIX = "dukenim:checkout:idempotency:";

type CheckoutKeyRecord = { fingerprint: string; key: string };
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function checkoutPayloadFingerprint(payload: unknown): string {
  return JSON.stringify(payload);
}

export function getOrCreateCheckoutKey(
  storage: StorageLike,
  slug: string,
  fingerprint: string,
  createKey: () => string = () => crypto.randomUUID(),
): string {
  const storageKey = `${KEY_PREFIX}${slug}`;
  try {
    const existing = JSON.parse(storage.getItem(storageKey) ?? "null") as CheckoutKeyRecord | null;
    if (existing?.fingerprint === fingerprint && UUID.test(existing.key)) return existing.key;
  } catch {
    // Corrupt browser state is replaced below; it must never block checkout.
  }
  const key = createKey();
  if (!UUID.test(key)) throw new Error("Checkout idempotency key is invalid");
  storage.setItem(storageKey, JSON.stringify({ fingerprint, key } satisfies CheckoutKeyRecord));
  return key;
}

export function clearCheckoutKey(storage: StorageLike, slug: string): void {
  storage.removeItem(`${KEY_PREFIX}${slug}`);
}
