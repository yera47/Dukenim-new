import type { OwnerStore } from "./owner";

export type StudioReadiness = {
  products: number;
  stockedProducts: number;
  newOrders: number;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pickupAddress: string;
};

export type StudioStep = { title: string; detail: string; action: string; route: string; progress: string };

type MetricResult = { count?: number | null; data?: unknown; error?: unknown };

export function resolveStudioReadiness(results: MetricResult[]): StudioReadiness {
  const [products, stocked, orders, settings] = results;
  if (!products || !stocked || !orders || !settings || products.error || stocked.error || orders.error || settings.error
    || products.count === null || products.count === undefined
    || stocked.count === null || stocked.count === undefined
    || orders.count === null || orders.count === undefined) {
    throw new Error("Studio readiness is unavailable");
  }
  const data = (settings.data ?? null) as { pickup_enabled?: boolean; delivery_enabled?: boolean; pickup_location?: { address?: string } | null } | null;
  return {
    products: products.count,
    stockedProducts: stocked.count,
    newOrders: orders.count,
    pickupEnabled: Boolean(data?.pickup_enabled),
    deliveryEnabled: Boolean(data?.delivery_enabled),
    pickupAddress: String(data?.pickup_location?.address ?? ""),
  };
}

export async function loadStudioReadiness(loader: () => Promise<MetricResult[]>): Promise<StudioReadiness> {
  return resolveStudioReadiness(await loader());
}

export const studioPreviewReadiness: StudioReadiness = {
  products: 0,
  stockedProducts: 0,
  newOrders: 0,
  pickupEnabled: false,
  deliveryEnabled: false,
  pickupAddress: "",
};

export function studioNextStep(store: OwnerStore, state: StudioReadiness): StudioStep {
  if (store.catalog_status === "not_started") return {
    title: "Соберите витрину", detail: "Выберите шаблон, цвета и способы получения заказа. Черновик продолжится на сайте и в приложении.",
    action: "Продолжить сборку", route: "/catalog-builder", progress: "1/4",
  };
  if (store.catalog_published && state.newOrders > 0) return {
    title: `Новые заказы: ${state.newOrders}`, detail: "Проверьте оплату и подтвердите заказы после фактического поступления денег.",
    action: "Открыть заказы", route: "/orders", progress: "СЕЙЧАС",
  };
  if (state.products === 0) return {
    title: "Добавьте первый товар", detail: "Укажите реальные фото, цену и остаток. Без товара витрину нельзя открыть покупателям.",
    action: "Добавить товар", route: "/product-new", progress: "2/4",
  };
  if (state.stockedProducts === 0) return {
    title: "Пополните остаток", detail: "Активные товары есть, но ни один вариант не доступен к продаже. Добавьте реальное количество на склад.",
    action: "Открыть склад", route: "/stock", progress: "2/4",
  };
  if ((!state.pickupEnabled && !state.deliveryEnabled) || (state.pickupEnabled && !state.pickupAddress.trim())) return {
    title: "Настройте получение заказа", detail: "Укажите адрес самовывоза или включите доставку с согласованием стоимости.",
    action: "Настроить получение", route: "/delivery", progress: "3/4",
  };
  if (!store.catalog_published) return {
    title: "Проверьте и откройте витрину", detail: "Посмотрите каталог как покупатель и опубликуйте магазин, когда всё готово.",
    action: "Проверить витрину", route: "/catalog", progress: "4/4",
  };
  return {
    title: "Магазин открыт", detail: "Новых заказов нет. Проверьте реальные показатели и настройте следующую акцию.",
    action: "Открыть аналитику", route: "/analytics", progress: "ГОТОВО",
  };
}
