import { useEffect, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { notificationTarget } from "@/lib/notification-target";

type Order = { order_number: number | null; status: string; total: number; delivery_method: string | null; payment_status: string };
const statuses: Record<string, string> = { new: "Новый", confirmed: "Подтверждён", assembled: "Собран", delivering: "Доставляется", done: "Завершён", cancelled: "Отменён" };
const payments: Record<string, string> = { pending: "Ожидает оплаты", unpaid: "Не оплачен", paid: "Оплачен", refunded: "Возвращён", failed: "Ошибка оплаты" };

export default function OrderScreen() {
  const params = useLocalSearchParams<{ orderId?: string; tenantId?: string }>();
  const { orderId, tenantId } = params;
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  useEffect(() => {
    const client = supabase;
    let active = true;
    let revision = 0;
    const load = async () => {
      const current = ++revision;
      setOrder(null); setMessage(""); setLoading(true); setNeedsLogin(false);
      try {
        const target = notificationTarget({ orderId, tenantId });
        if (!target) throw new Error("Некорректная ссылка на заказ.");
        if (!client) throw new Error("Мобильное подключение ещё не настроено.");
        const { data: { user }, error: authError } = await client.auth.getUser();
        if (authError || !user) {
          if (active && current === revision) setNeedsLogin(true);
          throw new Error("Войдите в свой аккаунт — после входа откроем этот заказ.");
        }
        // Session-scoped RLS remains authoritative, including after an account switch.
        const { data, error } = await client.from("orders")
          .select("order_number,status,total,delivery_method,payment_status")
          .eq("id", target.orderId).eq("tenant_id", target.tenantId).maybeSingle();
        if (error) throw new Error("Не удалось загрузить заказ. Проверьте соединение.");
        if (!data) throw new Error("Заказ недоступен для этого аккаунта или уже удалён.");
        if (active && current === revision) setOrder(data as Order);
      } catch (error) {
        if (active && current === revision) setMessage(error instanceof Error ? error.message : "Не удалось открыть заказ.");
      } finally { if (active && current === revision) setLoading(false); }
    };
    void load();
    const subscription = client?.auth.onAuthStateChange(() => {
      ++revision; setOrder(null);
      setTimeout(() => { if (active) void load(); }, 0);
    });
    return () => { active = false; ++revision; subscription?.data.subscription.unsubscribe(); };
  }, [orderId, tenantId]);
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Link href={needsLogin ? { pathname: "/", params: notificationTarget(params) ?? {} } : "/"} style={styles.link}>← {needsLogin ? "Войти в Dukenim" : "Dukenim"}</Link>
    {loading ? <ActivityIndicator /> : order ? <View style={styles.card}>
      <Text style={styles.title}>Заказ {order.order_number == null ? "" : `№${order.order_number}`}</Text>
      <Text>{statuses[order.status] ?? "Статус уточняется"}</Text>
      <Text style={styles.total}>{order.total.toLocaleString("ru-RU")} ₸</Text>
      <Text>{order.delivery_method === "pickup" ? "Самовывоз" : "Доставка"}</Text>
      <Text>{payments[order.payment_status] ?? "Статус оплаты уточняется"}</Text>
      <Text style={styles.note}>Данные загружены из вашего магазина. Управление заказом доступно в веб-кабинете.</Text>
    </View> : <Text accessibilityRole="alert">{message}</Text>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: "#FAFAFA" }, content: { padding: 24, gap: 24 }, link: { color: "#171717", fontWeight: "700" }, card: { padding: 24, backgroundColor: "#FFFFFF", borderRadius: 20, gap: 16, borderWidth: 1, borderColor: "#E5E5E5" }, title: { fontSize: 26, fontWeight: "700" }, total: { fontSize: 30, fontWeight: "700" }, note: { color: "#626262", lineHeight: 20 } });
