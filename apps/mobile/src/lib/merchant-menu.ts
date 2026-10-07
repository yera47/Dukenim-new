import type { AppSymbolName } from "../components/app-symbol";

export const merchantMenuGroups: ReadonlyArray<{title:string;items:ReadonlyArray<{title:string;copy:string;path:string;icon:AppSymbolName}>}> = [
  { title: "Продажи", items: [
    { title: "Остатки", copy: "Наличие и движения", path: "/stock", icon: "shippingbox" },
    { title: "Клиенты", copy: "История покупателей", path: "/customers", icon: "person.2" },
    { title: "Аналитика", copy: "Продажи и показатели", path: "/analytics", icon: "chart.bar" },
  ] },
  { title: "Продвижение", items: [
    { title: "Сборка магазина", copy: "AI оформление и витрина", path: "/store-builder", icon: "sparkles" },
    { title: "Истории", copy: "Фото и видео для гостей", path: "/stories", icon: "play.rectangle" },
    { title: "Акции", copy: "Кампании и предложения", path: "/campaigns", icon: "tag" },
    { title: "Лояльность", copy: "Баллы и скидки", path: "/loyalty", icon: "gift" },
  ] },
  { title: "Управление", items: [
    { title: "Сотрудники", copy: "Приглашения и права", path: "/team", icon: "person.badge.plus" },
    { title: "Доставка и оплата", copy: "Kaspi, самовывоз и зоны", path: "/delivery", icon: "truck.box" },
    { title: "Интеграции", copy: "CRM и другие системы", path: "/integrations", icon: "point.3.connected.trianglepath.dotted" },
    { title: "Тариф", copy: "План и период оплаты", path: "/plan", icon: "creditcard" },
    { title: "Поддержка", copy: "Чат с командой Dukenim", path: "/support", icon: "message" },
    { title: "Настройки", copy: "Уведомления и аккаунт", path: "/settings", icon: "gearshape" },
  ] },
] as const;
