import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { updateOrdersWidget } from "@/widgets/orders-widget";

type Filter = "all" | "new" | "active" | "done";
type MobileOrder = {
  id: string;
  tenant_id: string;
  order_number: number | null;
  status: string;
  total: number;
  delivery_method: string | null;
  payment_status: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  assembled: "Собран",
  delivering: "Доставляется",
  done: "Завершён",
  cancelled: "Отменён",
};

const filterLabels: Record<Filter, string> = {
  all: "Все",
  new: "Новые",
  active: "В работе",
  done: "Завершённые",
};

function matchesFilter(order: MobileOrder, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "new") return order.status === "new";
  if (filter === "done") return order.status === "done" || order.status === "cancelled";
  return ["confirmed", "assembled", "delivering"].includes(order.status);
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<MobileOrder[]>([]);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async (quiet = false) => {
    const client = supabase;
    if (!quiet) setLoading(true);
    setMessage("");
    try {
      if (!client) throw new Error("Мобильное подключение ещё не настроено.");
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) throw new Error("Сессия закончилась. Войдите снова.");

      const { data: memberships, error: membershipError } = await client
        .from("tenant_users")
        .select("tenant_id")
        .eq("user_id", user.id);
      if (membershipError) throw new Error("Не удалось загрузить ваши магазины.");

      const tenantIds = [...new Set((memberships ?? []).map((item) => item.tenant_id as string))];
      if (tenantIds.length === 0) {
        setOrders([]);
        updateOrdersWidget([]);
        setStoreNames({});
        setMessage("У этого аккаунта пока нет магазина. Создайте его на dukenim.kz.");
        return;
      }

      const [{ data: tenants, error: tenantError }, { data: orderRows, error: orderError }] = await Promise.all([
        client.from("tenants").select("id,name").in("id", tenantIds),
        client
          .from("orders")
          .select("id,tenant_id,order_number,status,total,delivery_method,payment_status,created_at")
          .in("tenant_id", tenantIds)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (tenantError || orderError) throw new Error("Не удалось обновить заказы. Проверьте интернет.");

      setStoreNames(Object.fromEntries((tenants ?? []).map((tenant) => [tenant.id as string, tenant.name as string])));
      const nextOrders = (orderRows ?? []) as MobileOrder[];
      setOrders(nextOrders);
      updateOrdersWidget(nextOrders);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось открыть заказы.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleOrders = useMemo(() => orders.filter((order) => matchesFilter(order, filter)), [orders, filter]);

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor="#0E3854" />}
      >
        <View style={styles.topRow}>
          <Link href="/" style={styles.back}>← Главная</Link>
          <View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>Обновляется</Text></View>
        </View>
        <Text style={styles.eyebrow}>РАБОЧАЯ ЛЕНТА</Text>
        <Text style={styles.title}>Заказы</Text>
        <Text style={styles.subtitle}>Новые заказы сверху. Потяните экран вниз, чтобы обновить.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(Object.keys(filterLabels) as Filter[]).map((key) => (
            <Pressable key={key} onPress={() => setFilter(key)} style={[styles.filter, filter === key && styles.filterActive]}>
              <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{filterLabels[key]}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? <ActivityIndicator color="#0E3854" style={styles.loader} /> : null}
        {!loading && message ? <View style={styles.notice}><Text style={styles.noticeText}>{message}</Text></View> : null}
        {!loading && !message && visibleOrders.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>Здесь пока тихо</Text><Text style={styles.subtitle}>Заказы выбранной категории появятся автоматически.</Text></View>
        ) : null}

        <View style={styles.list}>
          {visibleOrders.map((order) => (
            <Link key={order.id} href={{ pathname: "/order", params: { orderId: order.id, tenantId: order.tenant_id } }} asChild>
              <Pressable style={({ pressed }) => [styles.orderCard, pressed && styles.pressed]}>
                <View style={styles.orderTop}>
                  <View style={styles.orderHeading}>
                    <Text style={styles.orderNumber}>{order.order_number == null ? "Заказ" : `Заказ №${order.order_number}`}</Text>
                    <Text style={styles.store}>{storeNames[order.tenant_id] ?? "Ваш магазин"}</Text>
                  </View>
                  <Text style={styles.total}>{order.total.toLocaleString("ru-RU")} ₸</Text>
                </View>
                <View style={styles.orderBottom}>
                  <View style={[styles.status, order.status === "new" && styles.statusNew]}>
                    <Text style={[styles.statusText, order.status === "new" && styles.statusTextNew]}>{statusLabels[order.status] ?? order.status}</Text>
                  </View>
                  <Text style={styles.meta}>{order.delivery_method === "pickup" ? "Самовывоз" : "Доставка"} · {new Date(order.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 22, paddingBottom: 44 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  back: { color: "#0E3854", fontWeight: "800", fontSize: 15 },
  live: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#E9F4F9", paddingHorizontal: 11, paddingVertical: 7, borderRadius: 99 },
  liveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: "#1D8A66" },
  liveText: { color: "#0E3854", fontSize: 12, fontWeight: "700" },
  eyebrow: { color: "#63717B", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: "#101820", fontSize: 38, fontWeight: "900", marginTop: 5 },
  subtitle: { color: "#63717B", fontSize: 14, lineHeight: 21, marginTop: 7 },
  filters: { gap: 8, paddingVertical: 22 },
  filter: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDE3E7" },
  filterActive: { backgroundColor: "#0E3854", borderColor: "#0E3854" },
  filterText: { color: "#45545F", fontWeight: "800" },
  filterTextActive: { color: "#FFFFFF" },
  loader: { marginTop: 48 },
  notice: { backgroundColor: "#FFF7E8", borderColor: "#F0D7A5", borderWidth: 1, borderRadius: 18, padding: 18 },
  noticeText: { color: "#704E16", lineHeight: 21 },
  empty: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 24, borderWidth: 1, borderColor: "#E2E7EA" },
  emptyTitle: { color: "#101820", fontSize: 20, fontWeight: "900" },
  list: { gap: 12 },
  orderCard: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, borderWidth: 1, borderColor: "#E2E7EA", gap: 16 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  orderTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  orderHeading: { flex: 1, gap: 5 },
  orderNumber: { color: "#101820", fontSize: 18, fontWeight: "900" },
  store: { color: "#63717B", fontSize: 13 },
  total: { color: "#0E3854", fontSize: 18, fontWeight: "900" },
  orderBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  status: { backgroundColor: "#EFF2F4", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7 },
  statusNew: { backgroundColor: "#E1F0F8" },
  statusText: { color: "#45545F", fontSize: 12, fontWeight: "800" },
  statusTextNew: { color: "#0E3854" },
  meta: { flex: 1, color: "#74818A", fontSize: 12, textAlign: "right" },
});
