export function paymentChannelStatus(input: { method: "cash" | "kaspi"; verifiedAcquiringWebhook: boolean }) {
  if (input.method === "kaspi" && input.verifiedAcquiringWebhook) return { mode: "automatic" as const, canMarkPaidAutomatically: true };
  return { mode: "manual" as const, canMarkPaidAutomatically: false };
}

export function deliveryChannelStatus(provider: "own" | "yandex") {
  return provider === "yandex"
    ? { mode: "manual-after-order" as const, createsCourierJob: false, checkoutFeeKnown: false }
    : { mode: "merchant-fulfilled" as const, createsCourierJob: false, checkoutFeeKnown: true };
}
