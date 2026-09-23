export type OrderWidgetInput = { status: string };

export function updateOrdersWidget(orders: OrderWidgetInput[]): void {
  // iOS resolves orders-widget.ios.tsx. Other platforms intentionally do nothing.
  void orders;
}

export function clearOrdersWidget(): void {}
