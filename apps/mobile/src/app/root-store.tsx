import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, site } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Detail = {
  store: { id: string; name: string; slug: string; status: string; catalog_published: boolean };
  totals: { products: number; orders: number; customers: number };
  settings: { delivery_enabled: boolean; pickup_enabled: boolean; payment_online: boolean; payment_provider: string | null } | null;
  recentOrders: { id: string; total: number; status: string; payment_status: string; created_at: string }[];
  audit: { id: string; action: string; reason: string | null; created_at: string }[];
};

export default function RootStore() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [slug, setSlug] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(""); setDetail(null);
    try {
      if (!supabase || !id) throw new Error("Магазин не выбран");
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError || !data.session) throw new Error("Войдите заново");
      const response = await fetch(`${site}/api/mobile/root/stores/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Магазин не загружен");
      setDetail(body as Detail);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Магазин не загружен"); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const publish = () => {
    if (!detail || saving || slug.trim() !== detail.store.slug || reason.trim().length < 3) {
      Alert.alert("Проверьте подтверждение", "Введите точный адрес магазина и причину от 3 символов."); return;
    }
    const next = !detail.store.catalog_published;
    Alert.alert(next ? "Опубликовать витрину?" : "Скрыть витрину?", `${detail.store.name} · /s/${detail.store.slug}\nПричина: ${reason.trim()}`, [
      { text: "Отмена", style: "cancel" },
      { text: next ? "Опубликовать" : "Скрыть", onPress: () => void (async () => {
        setSaving(true);
        try {
          if (!supabase) throw new Error("Подключение недоступно");
          const { data, error: authError } = await supabase.auth.getSession();
          if (authError || !data.session) throw new Error("Войдите заново");
          const response = await fetch(`${site}/api/mobile/root/stores/${detail.store.id}/publication`, {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
            body: JSON.stringify({ slug: detail.store.slug, expected: detail.store.catalog_published, publish: next, reason: reason.trim() }),
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Состояние витрины не изменено");
          setReason(""); setSlug(""); await load();
          Alert.alert("Сохранено", next ? "Витрина опубликована" : "Витрина скрыта");
        } catch (cause) { Alert.alert("Не удалось сохранить", cause instanceof Error ? cause.message : "Повторите попытку"); }
        finally { setSaving(false); }
      })() },
    ]);
  };

  return <SafeAreaView style={s.safe}><View style={s.header}><Pressable onPress={() => router.back()} accessibilityLabel="Назад" style={s.back}><Text style={s.backText}>‹</Text></Pressable><View><Text style={s.eyebrow}>DUKENIM HQ</Text><Text style={s.headerTitle}>Магазин</Text></View></View><ScrollView contentContainerStyle={s.body}>
    {loading ? <ActivityIndicator color={colors.navy} /> : null}
    {error ? <View style={s.card}><Text style={s.error}>{error}</Text><Pressable onPress={() => void load()} style={s.button}><Text style={s.buttonText}>Повторить</Text></Pressable></View> : null}
    {detail ? <>
      <Text style={s.title}>{detail.store.name}</Text><Text style={s.muted}>/s/{detail.store.slug} · {detail.store.status}</Text>
      <View style={s.card}><Text style={s.label}>СОСТОЯНИЕ</Text><Text style={s.value}>{detail.store.catalog_published ? "Витрина опубликована" : "Витрина скрыта"}</Text><Text style={s.muted}>Информация получена из той же базы, что и сайт.</Text></View>
      <View style={s.metrics}><Metric label="Товары" value={detail.totals.products} /><Metric label="Заказы" value={detail.totals.orders} /><Metric label="Клиенты" value={detail.totals.customers} /></View>
      <Pressable style={s.card} onPress={() => void Linking.openURL(`${site}/s/${encodeURIComponent(detail.store.slug)}`)}><Text style={s.value}>Открыть витрину ↗</Text><Text style={s.muted}>Покупательский каталог</Text></Pressable>
      <View style={s.card}><Text style={s.value}>Получение и оплата</Text><Text style={s.muted}>Доставка: {detail.settings?.delivery_enabled ? "включена" : "выключена"}</Text><Text style={s.muted}>Самовывоз: {detail.settings?.pickup_enabled ? "включён" : "выключен"}</Text><Text style={s.muted}>Онлайн-оплата: {detail.settings?.payment_online ? detail.settings.payment_provider ?? "провайдер не указан" : "выключена"}</Text></View>
      <View style={s.card}><Text style={s.value}>Последние заказы</Text>{detail.recentOrders.length ? detail.recentOrders.map(order => <Text key={order.id} style={s.muted}>{new Date(order.created_at).toLocaleDateString("ru-RU")} · {order.total.toLocaleString("ru-RU")} ₸ · {order.status} · {order.payment_status}</Text>) : <Text style={s.muted}>Заказов пока нет</Text>}</View>
      <View style={s.card}><Text style={s.value}>История действий</Text>{detail.audit.length ? detail.audit.map(item => <Text key={item.id} style={s.muted}>{new Date(item.created_at).toLocaleDateString("ru-RU")} · {item.action}{item.reason ? ` · ${item.reason}` : ""}</Text>) : <Text style={s.muted}>Событий пока нет</Text>}</View>
      <View style={s.card}><Text style={s.value}>{detail.store.catalog_published ? "Скрыть витрину" : "Опубликовать витрину"}</Text><Text style={s.muted}>Сервер проверит актуальное состояние, тариф и готовность к публикации. Изменение сохранится в журнале.</Text><TextInput style={s.input} placeholder={`Введите ${detail.store.slug}`} value={slug} onChangeText={setSlug} autoCapitalize="none" /><TextInput style={s.input} placeholder="Причина изменения" value={reason} onChangeText={setReason} maxLength={1000} /><Pressable disabled={saving} style={[s.button, saving && { opacity: 0.5 }]} onPress={publish}><Text style={s.buttonText}>{saving ? "Сохраняем…" : detail.store.catalog_published ? "Проверить и скрыть" : "Проверить и опубликовать"}</Text></Pressable></View>
    </> : null}
  </ScrollView></SafeAreaView>;
}

function Metric({ label, value }: { label: string; value: number }) { return <View style={s.metric}><Text style={s.metricValue}>{value}</Text><Text style={s.muted}>{label}</Text></View>; }
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: "white" }, header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, back: { width: 42, height: 42, justifyContent: "center", alignItems: "center", borderRadius: 21, borderWidth: 1, borderColor: colors.line }, backText: { fontSize: 30, lineHeight: 34, color: colors.navy }, eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.4, color: colors.navy }, headerTitle: { fontSize: 17, fontWeight: "900", color: colors.ink }, body: { padding: 20, paddingBottom: 40, gap: 14 }, title: { fontSize: 31, fontWeight: "900", color: colors.ink }, muted: { color: colors.muted, fontSize: 13, lineHeight: 19 }, card: { padding: 18, borderRadius: 20, borderWidth: 1, borderColor: colors.line, gap: 9, backgroundColor: "white" }, label: { fontSize: 10, fontWeight: "900", letterSpacing: 1.3, color: colors.navy }, value: { fontSize: 17, fontWeight: "800", color: colors.ink }, metrics: { flexDirection: "row", gap: 8 }, metric: { flex: 1, borderRadius: 16, padding: 12, gap: 4, backgroundColor: colors.navySoft }, metricValue: { fontSize: 23, fontWeight: "900", color: colors.navyDark }, input: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 13, color: colors.ink }, button: { minHeight: 48, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy, paddingHorizontal: 15 }, buttonText: { color: "white", fontWeight: "900" }, error: { color: colors.danger } });
