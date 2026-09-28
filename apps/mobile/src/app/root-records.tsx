import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, site } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type AuditEvent = { id: string; action: string; reason: string | null; created_at: string; storeName: string };
type Subscription = { tenant_id: string; storeName: string; plan: string; status: string; current_period_end: string | null; polar_subscription_id: string | null };
type Checkout = { tenant_id: string; storeName: string; plan: string; status: string; final_amount: number; created_at: string };
type Crm = { tenant_id: string; storeName: string; status: string; amount_kzt: number; polar_order_id: string | null; created_at: string };
type Records = { section: "audit"; events: AuditEvent[]; limit: number } | { section: "finance"; subscriptions: Subscription[]; checkouts: Checkout[]; crm: Crm[]; limit: number };

const money = (value: number) => `${value.toLocaleString("ru-RU")} ₸`;
export default function RootRecords() {
  const params = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<"audit" | "finance">(params.section === "audit" ? "audit" : "finance");
  const [records, setRecords] = useState<Records | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError(""); setRecords(null);
    try {
      if (!supabase) throw new Error("Подключение недоступно");
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError || !data.session) throw new Error("Войдите заново");
      const response = await fetch(`${site}/api/mobile/root/records?section=${section}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Записи не загружены");
      setRecords(body as Records);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Записи не загружены"); }
    finally { setLoading(false); }
  }, [section]);
  useEffect(() => { void load(); }, [load]);
  return <SafeAreaView style={s.safe}><View style={s.header}><Pressable style={s.back} accessibilityLabel="Назад" onPress={() => router.back()}><Text style={s.backText}>‹</Text></Pressable><View><Text style={s.eyebrow}>DUKENIM HQ</Text><Text style={s.heading}>{section === "audit" ? "Аудит" : "Финансы"}</Text></View></View><ScrollView contentContainerStyle={s.body}>
    <View style={s.tabs}><Pressable style={[s.tab, section === "finance" && s.active]} onPress={() => setSection("finance")}><Text style={[s.tabText, section === "finance" && s.activeText]}>Финансы</Text></Pressable><Pressable style={[s.tab, section === "audit" && s.active]} onPress={() => setSection("audit")}><Text style={[s.tabText, section === "audit" && s.activeText]}>Аудит</Text></Pressable></View>
    {section === "finance" ? <><Text style={s.title}>Платежи и тарифы</Text><Text style={s.muted}>Записи Dukenim. Фактические зачисления и возвраты сверяются с платёжным провайдером.</Text></> : <><Text style={s.title}>Журнал действий</Text><Text style={s.muted}>Последние действия суперадминистратора и системные события.</Text></>}
    {loading ? <ActivityIndicator color={colors.navy} /> : null}{error ? <View style={s.card}><Text style={s.error}>{error}</Text><Pressable onPress={() => void load()}><Text style={s.link}>Повторить</Text></Pressable></View> : null}
    {records?.section === "audit" ? <><Text style={s.limit}>ПОСЛЕДНИЕ ДО {records.limit} СОБЫТИЙ</Text>{records.events.length ? records.events.map(event => <View key={event.id} style={s.card}><Text style={s.cardTitle}>{event.action}</Text><Text style={s.muted}>{event.storeName}</Text><Text style={s.muted}>Причина: {event.reason ?? "—"}</Text><Text style={s.date}>{new Date(event.created_at).toLocaleString("ru-RU")}</Text></View>) : <Text style={s.muted}>Событий пока нет</Text>}</> : null}
    {records?.section === "finance" ? <><Text style={s.limit}>ПОСЛЕДНИЕ ДО {records.limit} ЗАПИСЕЙ КАЖДОГО ТИПА</Text><Text style={s.sectionTitle}>Подписки</Text>{records.subscriptions.length ? records.subscriptions.map((row, index) => <View key={`${row.tenant_id}-${index}`} style={s.card}><Text style={s.cardTitle}>{row.storeName}</Text><Text style={s.muted}>{row.plan} · {row.status}</Text><Text style={s.muted}>Период до: {row.current_period_end ? new Date(row.current_period_end).toLocaleDateString("ru-RU") : "—"}</Text><Text style={s.muted}>Polar: {row.polar_subscription_id ? "есть ID" : "нет ID"}</Text></View>) : <Text style={s.muted}>Подписок нет</Text>}<Text style={s.sectionTitle}>Заявки на тариф</Text>{records.checkouts.length ? records.checkouts.map((row, index) => <View key={`${row.tenant_id}-${index}`} style={s.card}><Text style={s.cardTitle}>{row.storeName} · {money(row.final_amount)}</Text><Text style={s.muted}>{row.plan} · {row.status}</Text></View>) : <Text style={s.muted}>Заявок нет</Text>}<Text style={s.sectionTitle}>Подключение CRM</Text>{records.crm.length ? records.crm.map((row, index) => <View key={`${row.tenant_id}-${index}`} style={s.card}><Text style={s.cardTitle}>{row.storeName} · {money(row.amount_kzt)}</Text><Text style={s.muted}>{row.status} · {row.polar_order_id ? "есть Polar ID" : "нет Polar ID"}</Text></View>) : <Text style={s.muted}>Начислений нет</Text>}</> : null}
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: "white" }, header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, back: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, borderWidth: 1, borderColor: colors.line }, backText: { fontSize: 30, lineHeight: 34, color: colors.navy }, eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: colors.navy }, heading: { fontSize: 17, fontWeight: "900", color: colors.ink }, body: { padding: 20, paddingBottom: 45, gap: 14 }, title: { fontSize: 29, fontWeight: "900", color: colors.ink }, muted: { color: colors.muted, fontSize: 13, lineHeight: 19 }, limit: { color: colors.navy, fontWeight: "900", fontSize: 10, letterSpacing: 1 }, tabs: { flexDirection: "row", gap: 7, backgroundColor: colors.navySoft, padding: 5, borderRadius: 15 }, tab: { flex: 1, padding: 10, alignItems: "center", borderRadius: 11 }, active: { backgroundColor: "white" }, tabText: { color: colors.muted, fontWeight: "800" }, activeText: { color: colors.navyDark }, sectionTitle: { fontSize: 21, fontWeight: "900", color: colors.ink, marginTop: 9 }, card: { borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 16, gap: 6 }, cardTitle: { fontSize: 15, fontWeight: "900", color: colors.ink }, date: { color: colors.muted, fontSize: 11 }, link: { color: colors.navy, fontWeight: "900" }, error: { color: colors.danger } });
