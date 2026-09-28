import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { AppScreen, ui } from "@/components/app-shell";
import { useOwnerStore } from "@/lib/use-owner-store";
import { colors, money } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string | null;
  phone: string;
  orders_count: number;
  total_spent: number;
  last_order: string | null;
};

const pageSize = 500;
const maxPages = 201;

export default function Customers() {
  const { store, loading: storeLoading, error: storeError, reload: reloadStore } = useOwnerStore();
  const [rows, setRows] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!store) return;
    if (!supabase) { setLoading(false); setMessage("Подключение недоступно. Повторите попытку позже."); return; }
    const currentRequest = ++requestId.current;
    setLoading(true);
    setMessage("");
    setRows([]);
    try {
      const customers: Customer[] = [];
      let cursor = "";
      let complete = false;
      for (let page = 0; page < maxPages; page += 1) {
        let request = supabase.from("customers")
          .select("id,name,phone,orders_count,total_spent,last_order")
          .eq("tenant_id", store.id)
          .order("id", { ascending: true })
          .limit(pageSize);
        if (cursor) request = request.gt("id", cursor);
        const { data, error } = await request;
        if (currentRequest !== requestId.current) return;
        if (error) throw error;
        const batch = (data ?? []) as Customer[];
        customers.push(...batch);
        if (batch.length < pageSize) { complete = true; break; }
        cursor = batch[batch.length - 1].id;
      }
      if (!complete) throw new Error("Список слишком велик для загрузки в приложении.");
      customers.sort((a, b) => (b.last_order ?? "").localeCompare(a.last_order ?? "") || a.id.localeCompare(b.id));
      setRows(customers);
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      setRows([]);
      setMessage(error instanceof Error && error.message === "Список слишком велик для загрузки в приложении."
        ? error.message : "Не удалось загрузить клиентов. Повторите попытку.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    if (store) void load();
    return () => { requestId.current += 1; };
  }, [load, store]);

  const visible = useMemo(() => rows.filter(row => `${row.name ?? ""} ${row.phone}`.toLowerCase().includes(query.trim().toLowerCase())), [rows, query]);
  const orderAmount = useMemo(() => rows.reduce((sum, row) => sum + row.total_spent, 0), [rows]);

  return <AppScreen section="Клиенты" store={store?.name}>
    <Text style={ui.title}>Клиенты</Text>
    <Text style={ui.subtitle}>База пополняется при оформлении заказов и синхронизируется с сайтом.</Text>
    <TextInput value={query} onChangeText={setQuery} placeholder="Имя или телефон" style={ui.input} />
    {storeLoading || loading && store ? <ActivityIndicator color={colors.navy} /> : null}
    {storeError || message ? <View style={ui.card}><Text style={ui.error}>{storeError || message}</Text>{!loading ? <Pressable onPress={() => void (store ? load() : reloadStore())} style={ui.outline}><Text style={ui.outlineText}>Повторить</Text></Pressable> : null}</View> : null}
    {!storeLoading && !loading && store && !storeError && !message ? <>
      <Pressable onPress={() => void load()} style={ui.outline}><Text style={ui.outlineText}>Обновить клиентов</Text></Pressable>
      <View style={s.summary}>
        <View><Text style={s.number}>{rows.length}</Text><Text style={s.label}>клиентов</Text></View>
        <View><Text style={s.number}>{money(orderAmount)}</Text><Text style={s.label}>стоимость заказанных товаров</Text></View>
      </View>
      <Text style={ui.subtitle}>Включает неоплаченные и отменённые заказы. Это не подтверждённая выручка.</Text>
      <View style={{ gap: 10 }}>{visible.map(row => <View key={row.id} style={ui.card}>
        <View style={s.top}><View style={{ flex: 1 }}><Text style={s.name}>{row.name || "Покупатель"}</Text><Text style={s.phone}>{row.phone}</Text></View><Text style={s.spent}>{money(row.total_spent)}</Text></View>
        <Text style={s.meta}>{row.orders_count} заказов{row.last_order ? ` · последний ${new Date(row.last_order).toLocaleDateString("ru-RU")}` : ""}</Text>
      </View>)}</View>
      {!visible.length ? <View style={s.empty}>
        <SymbolView name="person.crop.circle" size={54} tintColor={colors.navy} />
        <Text style={s.emptyTitle}>{rows.length ? "По запросу клиентов нет" : "В базе пока нет клиентов"}</Text>
        <Text style={ui.subtitle}>{rows.length ? "Попробуйте другое имя или номер." : "Клиенты появятся автоматически после первых заказов на вашей витрине."}</Text>
        {!rows.length ? <Pressable onPress={() => router.push((store.catalog_published ? "/store-link" : "/catalog") as never)} style={ui.button}><Text style={ui.buttonText}>{store.catalog_published ? "Поделиться ссылкой на витрину" : "Подготовить витрину"}</Text></Pressable> : null}
      </View> : null}
    </> : null}
  </AppScreen>;
}

const s = StyleSheet.create({
  summary: { flexDirection: "row", gap: 26, borderRadius: 20, backgroundColor: colors.navyDark, padding: 18 },
  number: { color: "white", fontSize: 20, fontWeight: "900" },
  label: { color: "#BDD0DC", fontSize: 11, marginTop: 3 },
  top: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  name: { fontWeight: "900", fontSize: 17, color: colors.ink },
  phone: { color: colors.muted, marginTop: 4 },
  spent: { fontWeight: "900", color: colors.navyDark },
  meta: { color: colors.muted, fontSize: 12 },
  empty: { alignItems: "center", gap: 12, padding: 22, borderWidth: 1, borderColor: colors.line, borderRadius: 24, backgroundColor: "white" },
  emptyTitle: { color: colors.ink, fontSize: 21, fontWeight: "900", textAlign: "center" },
});
