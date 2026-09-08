export type SubmittedOrder = { orderNumber: number; total: number };

// Never clear a customer's cart on a network failure or an unexpected server body.
export async function submitCheckout(payload: unknown, send: typeof fetch = fetch): Promise<SubmittedOrder> {
  let response: Response;
  try {
    response = await send("/api/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Связь прервалась. Заказ мог быть принят: уточните у магазина перед повторной отправкой. Корзина сохранена.");
  }
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new Error("Не удалось прочитать ответ магазина. Уточните статус заказа перед повторной отправкой. Корзина сохранена."); }
  if (!response.ok) {
    throw new Error(data && typeof data === "object" && "error" in data && typeof data.error === "string"
      ? data.error : "Не удалось оформить заказ. Корзина сохранена.");
  }
  if (!data || typeof data !== "object" || !("orderNumber" in data) || !("total" in data)
    || !Number.isSafeInteger(data.orderNumber) || Number(data.orderNumber) < 1
    || !Number.isSafeInteger(data.total) || Number(data.total) < 0) {
    throw new Error("Магазин вернул неполное подтверждение. Уточните статус заказа перед повторной отправкой. Корзина сохранена.");
  }
  return { orderNumber: Number(data.orderNumber), total: Number(data.total) };
}
