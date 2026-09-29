import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppScreen, ui } from "@/components/app-shell";
import { useOwnerStore } from "@/lib/use-owner-store";
import { colors, money } from "@/lib/theme";
import { disableCurrentDevicePush } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { clearOrdersWidget } from "@/widgets/orders-widget";
import businessKit from "../../assets/images/dukenim-business-kit-v1.png";
import { FloatingBusinessVisual } from "@/components/floating-business-visual";

type Order = { id: string; status: string; payment_status: string; total: number; created_at: string };
type HomeStats = { todayRevenue: number; todayOrders: number; newOrders: number; products: number; lowStock: number; daily: { day: string; amount: number }[] };
const DAY = 86_400_000;
const kzDay = (time: number) => new Date(time + 5 * 3_600_000).toISOString().slice(0, 10);
const groups = [
  { title: "Продажи", items: [{ title: "Склад", copy: "Остатки и движения", path: "/stock" }, { title: "Клиенты", copy: "История покупателей", path: "/customers" }, { title: "Аналитика", copy: "Продажи и показатели", path: "/analytics" }] },
  { title: "Продвижение", items: [{ title: "Сборка магазина", copy: "Все блоки витрины в одном месте", path: "/store-builder" }, { title: "Истории", copy: "Фото и видео над меню", path: "/stories" }, { title: "Акции", copy: "Баннеры и кампании", path: "/campaigns" }, { title: "Лояльность", copy: "Подарки, скидки и друзья", path: "/loyalty" }] },
  { title: "Магазин", items: [{ title: "Сотрудники", copy: "Приглашения и права", path: "/team" }, { title: "Доставка и оплата", copy: "Kaspi, самовывоз и Яндекс", path: "/delivery" }, { title: "Интеграции", copy: "CRM, учёт и ресторанные системы", path: "/integrations" }, { title: "Тариф", copy: "Каталог · 24 900 ₸ в месяц", path: "/plan" }, { title: "Поддержка", copy: "Чат с командой Dukenim", path: "/support" }, { title: "Настройки", copy: "Уведомления и аккаунт", path: "/settings" }] },
] as const;

async function loadStats(tenantId: string): Promise<HomeStats> {
  if (!supabase) throw new Error("Нет подключения к данным.");
  const now = Date.now();
  const today = kzDay(now);
  const todayStart = Date.parse(`${today}T00:00:00+05:00`);
  const weekStart = todayStart - 6 * DAY;
  const orders: Order[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    let query = supabase.from("orders").select("id,status,payment_status,total,created_at").eq("tenant_id", tenantId).gte("created_at", new Date(weekStart).toISOString()).order("id", { ascending: true }).limit(1000);
    if (cursor) query = query.gt("id", cursor);
    const result = await query;
    if (result.error || !result.data) throw new Error("Не удалось загрузить сводку заказов.");
    orders.push(...result.data as Order[]);
    if (result.data.length < 1000) break;
    cursor = result.data[result.data.length - 1].id;
    if (page === 99) throw new Error("Для сводки нужен расширенный отчёт.");
  }
  const [productResult, lowResult] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("product_variants").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true).gt("stock_qty", 0).lte("stock_qty", 3),
  ]);
  if (productResult.error || lowResult.error) throw new Error("Не удалось загрузить каталог и остатки.");
  const byDay = new Map<string, number>();
  let todayRevenue = 0;
  let todayOrders = 0;
  let newOrders = 0;
  for (const order of orders) {
    const day = kzDay(Date.parse(order.created_at));
    if (day === today) { todayOrders++; if (order.status === "new") newOrders++; }
    if (order.payment_status !== "paid" || order.status === "cancelled") continue;
    if (!Number.isSafeInteger(order.total) || order.total < 0) throw new Error("В заказах найдена некорректная сумма.");
    byDay.set(day, (byDay.get(day) ?? 0) + order.total);
    if (day === today) todayRevenue += order.total;
  }
  return { todayRevenue, todayOrders, newOrders, products: productResult.count ?? 0, lowStock: lowResult.count ?? 0, daily: Array.from({ length: 7 }, (_, index) => { const day = kzDay(weekStart + index * DAY); return { day, amount: byDay.get(day) ?? 0 }; }) };
}

export default function More() {
  const { context, store, select } = useOwnerStore();
  const [signingOut, setSigningOut] = useState(false);
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    setStats(null); setStatsError("");
    if (!store) return;
    setStatsLoading(true);
    try { const next = await loadStats(store.id); if (current === requestId.current) setStats(next); }
    catch (cause) { if (current === requestId.current) setStatsError(cause instanceof Error ? cause.message : "Сводка недоступна."); }
    finally { if (current === requestId.current) setStatsLoading(false); }
  }, [store]);
  useEffect(() => { void load(); }, [load]);
  const max = Math.max(1, ...(stats?.daily.map(item => item.amount) ?? []));
  const signOut = () => {
    if (signingOut) return;
    Alert.alert("Выйти из Dukenim?", "Уведомления на этом устройстве будут отключены.", [{ text: "Отмена", style: "cancel" }, { text: "Выйти", style: "destructive", onPress: async () => {
      setSigningOut(true);
      try { if (!supabase) throw new Error("Подключение недоступно"); await disableCurrentDevicePush(); const { error } = await supabase.auth.signOut(); if (error) throw error; clearOrdersWidget(); router.replace("/"); }
      catch { Alert.alert("Не удалось выйти", "Проверьте соединение и повторите. Для безопасного выхода нужно отключить уведомления этого телефона."); }
      finally { setSigningOut(false); }
    } }]);
  };
  return <AppScreen section="Главная" store={store?.name}>
    <View style={s.hero}><View style={s.heroCopy}><Text style={s.storeEyebrow}>СЕГОДНЯ · ВАШ БИЗНЕС</Text><Text style={s.heroTitle}>{store?.name || "Dukenim"}</Text><Text style={s.heroText}>{store?.catalog_published ? "Витрина работает. Ниже — только актуальные данные магазина." : "Закончите витрину и добавьте товары перед публикацией."}</Text></View><FloatingBusinessVisual source={businessKit} accessibilityLabel="Инструменты магазина" compact style={s.heroArt} /></View>
    <View style={s.sectionHead}><View><Text style={s.sectionTitle}>Коротко о продажах</Text><Text style={s.sectionCopy}>Оплата отмечается магазином вручную</Text></View><Pressable onPress={() => void load()}><Text style={s.refresh}>Обновить ↻</Text></Pressable></View>
    {statsLoading ? <ActivityIndicator color={colors.navy} /> : null}
    {statsError ? <View style={s.errorCard}><Text style={ui.error}>{statsError}</Text><Text style={s.sectionCopy}>Показатели скрыты, пока данные не загрузятся полностью.</Text></View> : null}
    {stats ? <><View style={s.metrics}><Metric label="Оплачено сегодня" value={money(stats.todayRevenue)} /><Metric label="Заказов сегодня" value={String(stats.todayOrders)} /><Metric label="Новых" value={String(stats.newOrders)} accent /><Metric label="Мало на складе" value={String(stats.lowStock)} warn={stats.lowStock > 0} /></View><View style={s.chartCard}><View style={s.chartHead}><View><Text style={s.cardTitle}>Продажи за 7 дней</Text><Text style={s.sectionCopy}>Только оплаченные, без отмен</Text></View><Pressable onPress={() => router.push("/analytics" as never)}><Text style={s.cardLink}>Подробнее →</Text></Pressable></View><View style={s.chart}>{stats.daily.map(item => <View key={item.day} style={s.chartColumn}><View style={s.barArea}><View style={[s.bar, { height: Math.max(4, item.amount / max * 68) }]} /></View><Text style={s.day}>{item.day.slice(8)}</Text></View>)}</View></View></> : null}
    {store ? <View style={s.catalogCard}><View style={s.catalogTop}><View style={{ flex: 1 }}><Text style={s.storeEyebrow}>КАТАЛОГ</Text><Text style={s.catalogTitle}>{stats ? `${stats.products} позиций` : store.name}</Text><Text style={s.catalogMeta}>{store.catalog_published ? "Витрина опубликована" : "Витрина пока видна только вам"}</Text></View><Text style={[s.publication, store.catalog_published && s.publicationOn]}>{store.catalog_published ? "В эфире" : "Черновик"}</Text></View><View style={s.catalogActions}><HomeAction title="Добавить товар" copy="Фото, цена и остаток" onPress={() => router.push({ pathname: "/product-new", params: { tenantId: store.id, tenantName: store.name, vertical: store.business_vertical ?? "other" } } as never)} primary /><HomeAction title="Товары" copy="Изменить карточки" onPress={() => router.push("/catalog" as never)} /><HomeAction title="Дизайн" copy="Шаблон, цвета и обложка" onPress={() => router.push("/brand" as never)} /><HomeAction title="Предпросмотр" copy="Открыть глазами покупателя" onPress={() => router.push("/preview" as never)} /><HomeAction title="Ссылка" copy="Скопировать и поделиться" onPress={() => router.push("/store-link" as never)} wide /></View></View> : null}
    <View style={s.quickRow}><Quick title="Заказы" copy="Новые и текущие" path="/orders" /><Quick title="AI Studio" copy="Следующий шаг" path="/studio" /></View>
    {(context?.stores.length ?? 0) > 1 ? <View style={s.switcher}><Text style={s.groupTitle}>ВЫБРАННЫЙ МАГАЗИН</Text><View style={s.storeChips}>{context!.stores.map(item => <Pressable key={item.id} onPress={() => select(item)} style={[s.storeChip, item.id === store?.id && s.storeChipOn]}><Text style={[s.storeChipText, item.id === store?.id && s.storeChipTextOn]}>{item.name}</Text></Pressable>)}</View></View> : null}
    {groups.map(group => <View key={group.title} style={s.group}><Text style={s.groupTitle}>{group.title.toUpperCase()}</Text><View style={s.list}>{group.items.map(item => <Pressable accessibilityRole="button" key={item.path} onPress={() => router.push(item.path as never)} style={({ pressed }) => [s.row, pressed && ui.pressed]}><View style={s.icon}><Text style={s.iconText}>{item.title.slice(0, 1)}</Text></View><View style={{ flex: 1 }}><Text style={s.title}>{item.title}</Text><Text style={s.copy}>{item.copy}</Text></View><Text style={s.arrow}>›</Text></Pressable>)}</View></View>)}
    <Pressable disabled={signingOut} onPress={signOut} style={ui.outline}><Text style={ui.outlineText}>{signingOut ? "Выходим…" : "Выйти из аккаунта"}</Text></Pressable>
  </AppScreen>;
}

function Metric({ label, value, accent = false, warn = false }: { label: string; value: string; accent?: boolean; warn?: boolean }) { return <View style={[s.metric, accent && s.metricAccent, warn && s.metricWarn]}><Text numberOfLines={1} adjustsFontSizeToFit style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>; }
function Quick({ title, copy, path }: { title: string; copy: string; path: string }) { return <Pressable accessibilityRole="button" onPress={() => router.push(path as never)} style={({ pressed }) => [s.quick, pressed && ui.pressed]}><Text style={s.quickTitle}>{title}</Text><Text style={s.quickCopy}>{copy}</Text><Text style={s.quickArrow}>↗</Text></Pressable>; }
function HomeAction({ title, copy, onPress, primary = false, wide = false }: { title: string; copy: string; onPress: () => void; primary?: boolean; wide?: boolean }) { return <Pressable onPress={onPress} style={({ pressed }) => [s.homeAction, primary && s.homeActionPrimary, wide && s.homeActionWide, pressed && ui.pressed]}><Text style={[s.homeActionTitle, primary && s.homeActionTitlePrimary]}>{title} →</Text><Text style={[s.homeActionCopy, primary && s.homeActionCopyPrimary]}>{copy}</Text></Pressable>; }

const s = StyleSheet.create({
  hero: { minHeight: 182, borderRadius: 28, backgroundColor: "#111C25", padding: 20, overflow: "hidden", justifyContent: "center" }, heroCopy: { zIndex: 2, width: "62%", gap: 7 }, heroTitle: { fontSize: 28, lineHeight: 31, fontWeight: "900", letterSpacing: -.8, color: "white" }, heroText: { fontSize: 12, lineHeight: 18, color: "#D7E0E5" }, heroArt: { position: "absolute", width: 154, height: 154, right: -18, bottom: 4 },
  storeEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.4, color: "#CFAFC2" }, sectionHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }, sectionTitle: { fontSize: 23, fontWeight: "900", letterSpacing: -.5, color: colors.ink }, sectionCopy: { fontSize: 11, lineHeight: 16, color: colors.muted, marginTop: 3 }, refresh: { color: colors.navy, fontSize: 11, fontWeight: "900", paddingVertical: 6 }, errorCard: { borderRadius: 18, borderWidth: 1, borderColor: "#E7DDE3", padding: 15, backgroundColor: "#FBF7F9" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, metric: { width: "48%", minHeight: 91, borderRadius: 18, padding: 14, justifyContent: "center", backgroundColor: "#F4F6F7", borderWidth: 1, borderColor: "#E7ECEF" }, metricAccent: { backgroundColor: "#F6F0F4", borderColor: "#E4D4DE" }, metricWarn: { backgroundColor: "#FFF8EE", borderColor: "#F1DFC0" }, metricValue: { fontSize: 21, fontWeight: "900", color: colors.ink }, metricLabel: { fontSize: 11, color: colors.muted, marginTop: 5 },
  chartCard: { borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 17, backgroundColor: "white", gap: 15 }, chartHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }, cardTitle: { fontSize: 17, fontWeight: "900", color: colors.ink }, cardLink: { color: colors.navy, fontSize: 11, fontWeight: "900", paddingVertical: 4 }, chart: { height: 92, flexDirection: "row", alignItems: "flex-end", gap: 7 }, chartColumn: { flex: 1, alignItems: "center", gap: 5 }, barArea: { height: 68, width: "100%", justifyContent: "flex-end", borderRadius: 7, backgroundColor: "#F5F1F4", overflow: "hidden" }, bar: { width: "100%", minHeight: 4, borderRadius: 7, backgroundColor: colors.navy }, day: { fontSize: 9, fontWeight: "800", color: colors.muted },
  catalogCard: { borderRadius: 26, padding: 18, backgroundColor: colors.navyDark, gap: 15 }, catalogTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 }, catalogTitle: { fontSize: 24, fontWeight: "900", color: "white", marginTop: 5 }, catalogMeta: { fontSize: 12, color: "#E4D9E0", marginTop: 3 }, publication: { borderRadius: 999, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#FFFFFF1E", color: "#E4D9E0", fontSize: 10, fontWeight: "900" }, publicationOn: { backgroundColor: "#D9EFE2", color: "#28543D" }, catalogActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, homeAction: { width: "48%", minHeight: 78, borderRadius: 16, padding: 12, justifyContent: "center", backgroundColor: "#FFFFFF14", borderWidth: 1, borderColor: "#FFFFFF1B" }, homeActionPrimary: { backgroundColor: "white", borderColor: "white" }, homeActionWide: { width: "100%" }, homeActionTitle: { fontSize: 13, fontWeight: "900", color: "white" }, homeActionTitlePrimary: { color: colors.navyDark }, homeActionCopy: { fontSize: 10, lineHeight: 14, color: "#D8CCD3", marginTop: 4 }, homeActionCopyPrimary: { color: colors.muted },
  quickRow: { flexDirection: "row", gap: 9 }, quick: { flex: 1, minHeight: 118, borderRadius: 20, padding: 15, backgroundColor: "#F4F6F7", borderWidth: 1, borderColor: "#E9EEF1", justifyContent: "space-between" }, quickTitle: { fontSize: 17, fontWeight: "900", color: colors.ink }, quickCopy: { fontSize: 11, lineHeight: 16, color: colors.muted }, quickArrow: { fontSize: 22, fontWeight: "900", color: colors.navy },
  switcher: { gap: 8 }, storeChips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, storeChip: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 9 }, storeChipOn: { backgroundColor: colors.navy, borderColor: colors.navy }, storeChipText: { fontSize: 12, fontWeight: "800", color: colors.muted }, storeChipTextOn: { color: "white" }, group: { gap: 8 }, groupTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 1.35, color: colors.navy, marginLeft: 4, marginTop: 4 }, list: { borderWidth: 1, borderColor: colors.line, borderRadius: 22, backgroundColor: "white", overflow: "hidden" }, row: { minHeight: 76, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.navySoft, alignItems: "center", justifyContent: "center" }, iconText: { fontSize: 15, fontWeight: "900", color: colors.navyDark }, title: { fontSize: 16, fontWeight: "900", color: colors.ink }, copy: { fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 3 }, arrow: { fontSize: 30, fontWeight: "400", color: colors.navy },
});
