import type { Database } from "@/types/database";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const orderStatusLabels: Record<OrderStatus, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  assembled: "Собран",
  delivering: "Доставляется",
  done: "Завершён",
  cancelled: "Отменён",
};

export function orderCountLabel(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${count} заказов`;
  if (mod10 === 1) return `${count} заказ`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} заказа`;
  return `${count} заказов`;
}
