import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { router } from "expo-router";
import { AppScreen, ui } from "@/components/app-shell";
import { useOwnerStore } from "@/lib/use-owner-store";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Row = { id: string; product_id: string; stock_qty: number; size: string | null; sku: string | null; products: { title: string } | null };
type Movement = { id: string; variant_id: string; delta: number; reason: string; created_at: string };
const reasons: Record<string, string> = { sale: "Продажа", restock: "Приход", writeoff: "Списание", correction: "Корректировка", return: "Возврат", reservation: "Резерв" };

export default function Stock() {
  const { store, loading: storeLoading } = useOwnerStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [history, setHistory] = useState(false);
  const [operation, setOperation] = useState<{ variantId: string; kind: "restock" | "writeoff"; quantity: string } | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!store || !supabase) { setLoading(false); return; }
    setLoading(true);
    const [variants, journal] = await Promise.all([
      supabase.from("product_variants").select("id,product_id,stock_qty,size,sku,products(title)").eq("tenant_id", store.id).order("product_id"),
      supabase.from("stock_movements").select("id,variant_id,delta,reason,created_at").eq("tenant_id", store.id).order("created_at", { ascending: false }).limit(30),
    ]);
    if (currentRequest !== requestId.current) return;
    if (variants.error) {
      setRows([]);
      setMessage("Не удалось загрузить остатки. Повторите попытку.");
    } else {
      setRows((variants.data ?? []) as unknown as Row[]);
      setMessage("");
    }
    if (journal.error) {
      setMovements([]);
      if (!variants.error) setMessage("Остатки загружены, история движений пока недоступна.");
    } else setMovements((journal.data ?? []) as Movement[]);
    setLoading(false);
  }, [store]);
  useEffect(() => { setRows([]); setMovements([]); setOperation(null); void load(); }, [load]);

  const save = async (row: Row, value: number) => {
    if (!store || !supabase || !Number.isInteger(value) || value < 0 || value > 1_000_000) {
      Alert.alert("Проверьте количество", "Введите целое число от 0 до 1 000 000.");
      return;
    }
    if (value === row.stock_qty) return;
    setBusy(row.id);
    const { error } = await supabase.rpc("set_variant_stock", { p_tenant_id: store.id, p_variant_id: row.id, p_target: value });
    if (error) Alert.alert("Остаток не изменён", "Обновите экран и повторите.");
    else await load();
    setBusy("");
  };

  const recordMovement = async (row: Row) => {
    if (!store || !supabase || !operation || operation.variantId !== row.id) return;
    const quantity = Number(operation.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1_000_000 ||
      (operation.kind === "writeoff" && quantity > row.stock_qty) ||
      (operation.kind === "restock" && row.stock_qty + quantity > 1_000_000)) {
      Alert.alert("Проверьте количество", "Укажите целое количество в пределах доступного остатка.");
      return;
    }
    setBusy(row.id);
    const { error } = await supabase.from("stock_movements").insert({
      tenant_id: store.id,
      variant_id: row.id,
      delta: operation.kind === "restock" ? quantity : -quantity,
      reason: operation.kind,
    });
    if (error) {
      Alert.alert("Движение не сохранено", error.message.includes("Insufficient stock")
        ? "Остаток изменился или товара недостаточно. Обновите склад."
        : "Проверьте доступ к магазину и повторите после обновления.");
      await load();
    } else {
      setOperation(null);
      await load();
    }
    setBusy("");
  };

  const shown = useMemo(() => rows.filter(row =>
    (!lowOnly || row.stock_qty <= 5) &&
    (!search.trim() || `${row.products?.title ?? ""} ${row.size ?? ""} ${row.sku ?? ""}`.toLocaleLowerCase("ru").includes(search.trim().toLocaleLowerCase("ru")))
  ), [rows, lowOnly, search]);
  const names = useMemo(() => new Map(rows.map(row => [row.id, row.products?.title ?? "Товар"])), [rows]);

  return <AppScreen section="Склад" store={store?.name}>
    <Text style={ui.title}>Остатки</Text>
    <Text style={ui.subtitle}>Ручное изменение создаёт корректировку в журнале и синхронизируется с сайтом.</Text>
    {store?.business_vertical === "food" ? <Pressable onPress={() => router.push("/materials" as never)} style={s.materials}><View style={{ flex: 1 }}><Text style={s.materialsTitle}>Склад сырья</Text><Text style={s.materialsMeta}>Ингредиенты и техкарты блюд</Text></View><Text style={s.materialsArrow}>›</Text></Pressable> : null}
    <View style={s.controls}><TextInput accessibilityLabel="Поиск по товарам и артикулам" value={search} onChangeText={setSearch} placeholder="Найти товар или артикул" style={[ui.input, { flex: 1 }]} /><Pressable accessibilityLabel="Обновить остатки" onPress={() => void load()} style={s.refresh}><Text style={s.refreshText}>↻</Text></Pressable></View>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: lowOnly }} onPress={() => setLowOnly(value => !value)} style={[s.filter, lowOnly && s.filterOn]}><Text style={[s.filterText, lowOnly && s.filterTextOn]}>Малый остаток · до 5 шт.</Text></Pressable>
    {storeLoading || loading ? <ActivityIndicator color={colors.navy} /> : null}
    {message ? <Text style={ui.error}>{message}</Text> : null}
    {!loading && !storeLoading && !message && rows.length === 0 ? <View style={ui.card}><Text style={ui.cardTitle}>Нет товарных вариантов</Text><Text style={ui.subtitle}>Сначала добавьте товар в каталоге.</Text></View> : null}
    {!loading && rows.length > 0 && shown.length === 0 ? <Text style={ui.subtitle}>По этому фильтру товаров нет.</Text> : null}
    <View style={{ gap: 10 }}>{!loading && shown.map(row => <View key={row.id} style={s.stockCard}><View style={s.row}><View style={{ flex: 1 }}><Text style={s.name}>{row.products?.title ?? "Товар"}</Text><Text style={s.meta}>{row.size || row.sku || "Основной вариант"}</Text></View><Stepper value={row.stock_qty} disabled={Boolean(busy)} onSave={value => void save(row, value)} /></View><View style={s.operationActions}><Pressable accessibilityLabel={`Записать приход: ${row.products?.title ?? "товар"}`} disabled={Boolean(busy)} onPress={() => setOperation({ variantId: row.id, kind: "restock", quantity: "1" })} style={s.operationChoice}><Text style={s.operationText}>＋ Приход</Text></Pressable><Pressable accessibilityLabel={`Записать списание: ${row.products?.title ?? "товар"}`} disabled={Boolean(busy) || row.stock_qty === 0} onPress={() => setOperation({ variantId: row.id, kind: "writeoff", quantity: "1" })} style={s.operationChoice}><Text style={s.operationText}>− Списание</Text></Pressable></View>{operation?.variantId === row.id ? <View style={s.operationForm}><Text style={s.name}>{operation.kind === "restock" ? "Поступление" : "Списание"}</Text><Text style={s.meta}>Запись появится в журнале и на сайте.</Text><TextInput accessibilityLabel="Количество для движения" value={operation.quantity} onChangeText={quantity => setOperation(current => current ? { ...current, quantity: quantity.replace(/\D/g, "").slice(0, 7) } : null)} keyboardType="number-pad" style={[ui.input, s.operationInput]} /><View style={s.operationActions}><Pressable disabled={Boolean(busy)} onPress={() => setOperation(null)} style={s.operationChoice}><Text style={s.operationText}>Отмена</Text></Pressable><Pressable disabled={Boolean(busy) || !operation.quantity} onPress={() => void recordMovement(row)} style={[s.confirmButton, (busy || !operation.quantity) && s.saveDisabled]}><Text style={s.confirmText}>{busy === row.id ? "Сохраняем…" : "Записать"}</Text></Pressable></View></View> : null}</View>)}</View>
    <Pressable onPress={() => setHistory(value => !value)} style={s.historyHeader}><View><Text style={ui.cardTitle}>История движений</Text><Text style={s.meta}>Последние 30 записей</Text></View><Text style={s.historyArrow}>{history ? "⌃" : "⌄"}</Text></Pressable>
    {history ? <View style={{ gap: 8 }}>{!movements.length ? <Text style={ui.subtitle}>{loading ? "Загружаем…" : "Движений пока нет или журнал недоступен."}</Text> : movements.map(item => <View key={item.id} style={s.movement}><View style={{ flex: 1 }}><Text style={s.name}>{names.get(item.variant_id) ?? "Удалённый товар"}</Text><Text style={s.meta}>{reasons[item.reason] ?? item.reason} · {new Date(item.created_at).toLocaleString("ru-KZ")}</Text></View><Text style={[s.delta, item.delta < 0 && s.negative]}>{item.delta > 0 ? "+" : ""}{item.delta}</Text></View>)}</View> : null}
  </AppScreen>;
}

function Stepper({ value, onSave, disabled }: { value: number; onSave: (value: number) => void; disabled: boolean }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const changed = text !== String(value);
  const valid = text.length > 0 && Number(text) <= 1_000_000;
  return <View style={s.stepContainer}><View style={s.step}><Pressable accessibilityLabel="Уменьшить остаток" disabled={disabled || changed || value === 0} onPress={() => onSave(value - 1)} style={s.stepButton}><Text style={s.stepText}>−</Text></Pressable><TextInput accessibilityLabel="Количество на складе" value={text} editable={!disabled} onChangeText={next => setText(next.replace(/\D/g, "").slice(0, 7))} keyboardType="number-pad" selectTextOnFocus style={s.qty} /><Pressable accessibilityLabel="Увеличить остаток" disabled={disabled || changed || value >= 1_000_000} onPress={() => onSave(value + 1)} style={s.stepButton}><Text style={s.stepText}>＋</Text></Pressable></View>{changed ? <View style={s.editActions}><Pressable onPress={() => setText(String(value))} disabled={disabled}><Text style={s.cancelText}>Отмена</Text></Pressable><Pressable onPress={() => onSave(Number(text))} disabled={disabled || !valid} style={[s.saveButton, (!valid || disabled) && s.saveDisabled]}><Text style={s.saveText}>Сохранить</Text></Pressable></View> : null}</View>;
}

const s = StyleSheet.create({
  materials: { minHeight: 78, borderRadius: 18, backgroundColor: colors.navyDark, padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  materialsTitle: { color: "white", fontSize: 17, fontWeight: "900" }, materialsMeta: { fontSize: 12, color: "white", opacity: .75, marginTop: 4 }, materialsArrow: { color: "white", fontSize: 30 },
  controls: { flexDirection: "row", gap: 8 }, refresh: { width: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: "white" }, refreshText: { fontSize: 25, color: colors.navyDark },
  filter: { alignSelf: "flex-start", borderRadius: 99, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10 }, filterOn: { borderColor: colors.navy, backgroundColor: colors.navySoft }, filterText: { color: colors.muted, fontWeight: "800", fontSize: 12 }, filterTextOn: { color: colors.navyDark },
  stockCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 17, backgroundColor: "white", padding: 15, gap: 12 }, row: { flexDirection: "row", alignItems: "center", gap: 12 }, name: { fontWeight: "900", color: colors.ink, fontSize: 16 }, meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  operationActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" }, operationChoice: { minHeight: 38, paddingHorizontal: 12, borderRadius: 11, backgroundColor: colors.navySoft, alignItems: "center", justifyContent: "center" }, operationText: { color: colors.navyDark, fontWeight: "800", fontSize: 12 }, operationForm: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, gap: 8 }, operationInput: { width: 100 }, confirmButton: { minHeight: 38, paddingHorizontal: 16, borderRadius: 11, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }, confirmText: { color: "white", fontWeight: "900", fontSize: 12 },
  stepContainer: { alignItems: "flex-end", gap: 7 }, step: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 13, overflow: "hidden" }, stepButton: { width: 39, height: 42, alignItems: "center", justifyContent: "center", backgroundColor: colors.navySoft }, stepText: { fontSize: 19, fontWeight: "900", color: colors.navyDark }, qty: { width: 50, textAlign: "center", fontWeight: "900", color: colors.ink }, editActions: { flexDirection: "row", alignItems: "center", gap: 8 }, cancelText: { fontSize: 11, fontWeight: "800", color: colors.muted }, saveButton: { borderRadius: 9, backgroundColor: colors.navy, paddingHorizontal: 8, paddingVertical: 8 }, saveDisabled: { opacity: .45 }, saveText: { fontSize: 11, fontWeight: "900", color: "white" },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 18, marginTop: 8 }, historyArrow: { color: colors.navyDark, fontSize: 24 }, movement: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: "white", borderRadius: 13, padding: 12 }, delta: { color: colors.success, fontSize: 16, fontWeight: "900" }, negative: { color: colors.danger },
});
