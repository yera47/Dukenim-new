export type PaymentRequest = { amount: number; currency: "KZT"; description: string; reference: string };
export type PaymentResult = { success: boolean; paymentId?: string; status: "paid" | "failed" | "unavailable"; message?: string };

export function isPaymentConfigured() {
  return Boolean(process.env.PAYMENT_PROVIDER && process.env.PAYMENT_API_KEY && process.env.PAYMENT_MERCHANT_ID);
}

export async function processPayment(request: PaymentRequest): Promise<PaymentResult> {
  // Raw card details must never pass through Dukenim. A certified provider's hosted
  // checkout is connected here after merchant verification and credentials are issued.
  if (!request.amount || !isPaymentConfigured()) return { success: false, status: "unavailable", message: "Платёжный провайдер ещё не подключён" };
  return { success: false, status: "unavailable", message: "Для выбранного провайдера требуется адаптер API" };
}
