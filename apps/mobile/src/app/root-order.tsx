import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, site } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Detail = {
  order: { id: string; order_number: number | null; created_at: string; status: string; payment_status: string; payment_method: string | null; delivery_method: string | null; delivery_address: string | null; subtotal: number; delivery_cost: number; total: number; source: string };
  store: { id: string; name: string; slug: string };
  customer: { name: string; phone: string | null } | null;
  items: { title_snapshot: string; price_snapshot: number; qty: number }[];
  movements: { delta: number; reason: string; created_at: string }[];
};

const money = (value: number) => `${value.toLocaleString("ru-RU")} ₸`;
export default function RootOrder() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmNumber, setConfirmNumber] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(""); setDetail(null);
    try {
      if (!supabase || !id) throw new Error("Заказ не выбран");
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError || !data.session) throw new Error("Войдите заново");
      const response = await fetch(`${site}/api/mobile/root/orders/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось загрузить заказ");
      setDetail(body as Detail);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось загрузить заказ"); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  const cancel = () => {
    if (!detail?.order.order_number || confirmNumber !== String(detail.order.order_number) || reason.trim().length < 3 || saving) {
      Alert.alert("Проверьте подтверждение", "Введите точный номер заказа и причину от 3 символов."); return;
    }
    Alert.alert("Отменить неоплаченный заказ?", `№ ${detail.order.order_number} · ${detail.store.name}\nПричина: ${reason.trim()}\nОстатки и лояльность будут пересчитаны штатными правилами.`, [
      { text: "Назад", style: "cancel" },
      { text: "Отменить заказ", style: "destructive", onPress: () => void (async () => {
        setSaving(true);
        try {
          if (!supabase) throw new Error("Подключение недоступно");
          const { data, error: authError } = await supabase.auth.getSession();
          if (authError || !data.session) throw new Error("Войдите заново");
          const response = await fetch(`${site}/api/mobile/root/orders/${detail.order.id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ number: detail.order.order_number, expectedStatus: detail.order.status, reason: reason.trim() }) });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Заказ не отменён");
          setConfirmNumber(""); setReason(""); await load(); Alert.alert("Заказ отменён", "Изменение записано в журнале аудита.");
        } catch (cause) { Alert.alert("Не удалось отменить", cause instanceof Error ? cause.message : "Повторите попытку"); }
        finally { setSaving(false); }
      })() },
    ]);
  };
  return <SafeAreaView style={s.safe}><View style={s.header}><Pressable style={s.back} accessibilityLabel="Назад" onPress={() => router.back()}><Text style={s.backText}>‹</Text></Pressable><View><Text style={s.eyebrow}>DUKENIM HQ</Text><Text style={s.heading}>Детали заказа</Text></View></View><ScrollView contentContainerStyle={s.body}>
    {loading ? <ActivityIndicator color={colors.navy} /> : null}
    {error ? <View style={s.card}><Text style={s.error}>{error}</Text><Pressable onPress={() => void load()}><Text style={s.link}>Повторить</Text></Pressable></View> : null}
    {detail ? <><Text style={s.title}>Заказ № {detail.order.order_number ?? detail.order.id.slice(0, 8)}</Text><Text style={s.muted}>{detail.store.name} · {new Date(detail.order.created_at).toLocaleString("ru-RU")}</Text>
      <View style={s.card}><Text style={s.cardTitle}>Получение</Text><Text style={s.muted}>Статус: {detail.order.status}</Text><Text style={s.muted}>Способ: {detail.order.delivery_method ?? "—"}</Text><Text style={s.muted}>Адрес: {detail.order.delivery_address ?? "—"}</Text><Text style={s.muted}>Покупатель: {detail.customer?.name ?? "—"}</Text><Text style={s.muted}>Телефон: {detail.customer?.phone ?? "—"}</Text></View>
      <View style={s.card}><Text style={s.cardTitle}>Расчёт</Text><Text style={s.muted}>Товары: {money(detail.order.subtotal)}</Text><Text style={s.muted}>Доставка: {money(detail.order.delivery_cost)}</Text><Text style={s.value}>Итого: {money(detail.order.total)}</Text><Text style={s.muted}>Метод: {detail.order.payment_method ?? "—"}</Text><Text style={s.muted}>Статус оплаты в Dukenim: {detail.order.payment_status}</Text><Text style={s.warning}>Подтверждайте получение денег по выписке банка или Kaspi.</Text></View>
      <View style={s.card}><Text style={s.cardTitle}>Состав</Text>{detail.items.length ? detail.items.map((item, index) => <Text key={`${index}-${item.title_snapshot}`} style={s.muted}>{item.title_snapshot} × {item.qty} · {money(item.price_snapshot * item.qty)}</Text>) : <Text style={s.muted}>Позиции не найдены</Text>}</View>
      <View style={s.card}><Text style={s.cardTitle}>Движения остатков</Text>{detail.movements.length ? detail.movements.map((item, index) => <Text key={index} style={s.muted}>{item.reason}: {item.delta} · {new Date(item.created_at).toLocaleString("ru-RU")}</Text>) : <Text style={s.muted}>Связанных движений нет</Text>}</View>
      {detail.order.order_number && ["new", "confirmed", "assembled", "delivering"].includes(detail.order.status) && detail.order.payment_status === "pending" ? <View style={s.card}><Text style={s.cardTitle}>Отмена неоплаченного заказа</Text><Text style={s.muted}>Доступна только до завершения заказа. Оплаченный заказ сначала требует подтверждённого возврата денег.</Text><Text style={s.label}>Введите номер {detail.order.order_number}</Text><TextInput style={s.input} keyboardType="number-pad" value={confirmNumber} onChangeText={setConfirmNumber} /><Text style={s.label}>Причина отмены</Text><TextInput style={s.input} multiline maxLength={1000} value={reason} onChangeText={setReason} /><Pressable style={s.dangerButton} disabled={saving} onPress={cancel}><Text style={s.dangerText}>{saving ? "Отменяем…" : "Отменить заказ"}</Text></Pressable></View> : null}
      <Pressable style={s.store} onPress={() => router.push({ pathname: "/root-store" as never, params: { id: detail.store.id } })}><Text style={s.link}>Открыть магазин →</Text></Pressable>
    </> : null}
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: "white" }, header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, back: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 21 }, backText: { fontSize: 30, lineHeight: 34, color: colors.navy }, eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: colors.navy }, heading: { fontSize: 17, fontWeight: "900", color: colors.ink }, body: { padding: 20, paddingBottom: 45, gap: 14 }, title: { fontSize: 27, fontWeight: "900", color: colors.ink }, card: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, gap: 8 }, cardTitle: { fontSize: 18, fontWeight: "900", color: colors.ink }, muted: { fontSize: 13, lineHeight: 19, color: colors.muted }, value: { fontSize: 16, fontWeight: "900", color: colors.ink }, warning: { fontSize: 12, lineHeight: 18, color: colors.navy }, link: { color: colors.navy, fontWeight: "900" }, error: { color: colors.danger }, store: { padding: 17, borderRadius: 15, backgroundColor: colors.navySoft }, label: { color: colors.ink, fontSize: 13, fontWeight: "800" }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, color: colors.ink }, dangerButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.danger }, dangerText: { color: "white", fontWeight: "900" } });
