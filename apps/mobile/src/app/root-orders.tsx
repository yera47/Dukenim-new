import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, site } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Order = { id: string; tenant_id: string; order_number: number | null; status: string; payment_status: string; total: number; created_at: string; storeName: string };
const statuses = [{ value: "", label: "Все" }, { value: "new", label: "Новые" }, { value: "confirmed", label: "Подтверждены" }, { value: "assembled", label: "Собраны" }, { value: "delivering", label: "Доставка" }, { value: "done", label: "Готовы" }, { value: "cancelled", label: "Отменены" }];

export default function RootOrders() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [possiblyMore, setPossiblyMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError(""); setOrders([]);
    try {
      if (!supabase) throw new Error("Подключение недоступно");
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError || !data.session) throw new Error("Войдите заново");
      const url = `${site}/api/mobile/root/orders?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Заказы не загружены");
      setOrders(body.orders as Order[]); setPossiblyMore(Boolean(body.possiblyMore));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Заказы не загружены"); }
    finally { setLoading(false); }
  }, [query, status]);
  useEffect(() => { void load(); }, [load]);
  return <SafeAreaView style={s.safe}><View style={s.header}><Pressable onPress={() => router.back()} accessibilityLabel="Назад" style={s.back}><Text style={s.backText}>‹</Text></Pressable><View><Text style={s.eyebrow}>DUKENIM HQ</Text><Text style={s.headerTitle}>Заказы</Text></View></View><FlatList
    data={orders} keyExtractor={item => item.id} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled"
    ListHeaderComponent={<><Text style={s.title}>Заказы платформы</Text><Text style={s.muted}>Статусы и суммы сохранены в Dukenim. Статус «оплачено» не заменяет выписку банка или Kaspi.</Text><View style={s.searchRow}><TextInput style={[s.input, { flex: 1 }]} placeholder="Магазин, номер или ID" value={search} onChangeText={setSearch} onSubmitEditing={() => setQuery(search.trim())} /><Pressable style={s.button} onPress={() => setQuery(search.trim())}><Text style={s.buttonText}>Найти</Text></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{statuses.map(item => <Pressable key={item.value} onPress={() => setStatus(item.value)} style={[s.chip, status === item.value && s.chipActive]}><Text style={[s.chipText, status === item.value && s.chipTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>{loading ? <ActivityIndicator color={colors.navy} /> : null}{error ? <View style={s.card}><Text style={s.error}>{error}</Text><Pressable style={s.button} onPress={() => void load()}><Text style={s.buttonText}>Повторить</Text></Pressable></View> : null}{!loading && !error ? <Text style={s.eyebrow}>НАЙДЕНО {orders.length}{possiblyMore ? " · ПОИСК ПО ПОСЛЕДНИМ 500" : ""}</Text> : null}</>}
    renderItem={({ item }) => <View style={s.card}><View style={s.line}><Text style={s.value}>№ {item.order_number ?? item.id.slice(0, 8)}</Text><Text style={s.price}>{item.total.toLocaleString("ru-RU")} ₸</Text></View><Text style={s.muted}>{item.storeName}</Text><Text style={s.muted}>Заказ: {item.status} · Оплата: {item.payment_status}</Text><Text style={s.date}>{new Date(item.created_at).toLocaleString("ru-RU")}</Text></View>}
    ListEmptyComponent={!loading && !error ? <View style={s.card}><Text style={s.muted}>Заказов по запросу нет</Text></View> : null}
  /></SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: "white" }, header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, back: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, borderWidth: 1, borderColor: colors.line }, backText: { fontSize: 30, lineHeight: 34, color: colors.navy }, eyebrow: { color: colors.navy, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }, headerTitle: { fontSize: 17, fontWeight: "900", color: colors.ink }, body: { padding: 20, paddingBottom: 40, gap: 12 }, title: { fontSize: 30, fontWeight: "900", color: colors.ink }, muted: { color: colors.muted, fontSize: 13, lineHeight: 19 }, searchRow: { flexDirection: "row", gap: 8 }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 12, color: colors.ink }, button: { minHeight: 48, borderRadius: 13, paddingHorizontal: 14, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }, buttonText: { color: "white", fontWeight: "900" }, chips: { gap: 7, paddingVertical: 2 }, chip: { minHeight: 38, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, justifyContent: "center", borderRadius: 12 }, chipActive: { backgroundColor: colors.navySoft, borderColor: colors.navy }, chipText: { color: colors.muted, fontSize: 12, fontWeight: "700" }, chipTextActive: { color: colors.navyDark }, card: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, gap: 7, backgroundColor: "white" }, line: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, value: { color: colors.ink, fontSize: 16, fontWeight: "800" }, price: { color: colors.navyDark, fontSize: 16, fontWeight: "900" }, date: { color: colors.muted, fontSize: 11 }, error: { color: colors.danger } });
