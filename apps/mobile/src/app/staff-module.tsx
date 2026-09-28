import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, money } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Module = "catalog" | "stock" | "customers" | "analytics";
type Level = "none" | "read" | "write";
type RecordData = Record<string, unknown>;
const names: Record<Module, string> = { catalog: "Каталог", stock: "Склад", customers: "Клиенты", analytics: "Аналитика" };
const descriptions: Record<Module, string> = {
  catalog: "Карточки товаров и цены магазина",
  stock: "Фактические остатки и исправления через журнал движений",
  customers: "Контакты покупателей магазина",
  analytics: "Оплаченные заказы за последние 30 дней",
};
function field(record: RecordData, key: string) { return String(record[key] ?? ""); }
function validModule(value: unknown): value is Module { return typeof value === "string" && Object.prototype.hasOwnProperty.call(names, value); }

export default function StaffModule() {
  const params = useLocalSearchParams<{ accessId?: string; module?: string }>();
  const selectedModule = validModule(params.module) ? params.module : null;
  const accessId = params.accessId;
  const [records, setRecords] = useState<RecordData[]>([]);
  const [level, setLevel] = useState<Level>("none");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    if (!supabase || !accessId || !selectedModule) {
      setRecords([]); setError("Раздел недоступен."); setLoading(false); setRefreshing(false); return;
    }
    try {
      const membership = await supabase.from("staff_access").select("id,permissions,active").eq("id", accessId).eq("active", true).maybeSingle();
      if (membership.error || !membership.data) throw new Error("Доступ больше не действует.");
      const permission = (membership.data.permissions as Record<string, Level> | null)?.[selectedModule];
      if (permission !== "read" && permission !== "write") throw new Error("Владелец закрыл этот раздел.");
      const result = await supabase.rpc("staff_module_data" as never, { p_access: accessId, p_module: selectedModule } as never);
      if (result.error || !Array.isArray(result.data)) throw new Error("Не удалось загрузить данные раздела.");
      if (current !== requestId.current) return;
      setLevel(permission); setRecords(result.data.filter((row): row is RecordData => !!row && typeof row === "object" && !Array.isArray(row)));
      setError("");
    } catch (cause) {
      if (current !== requestId.current) return;
      setLevel("none"); setRecords([]);
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить раздел.");
    } finally {
      if (current === requestId.current) { setLoading(false); setRefreshing(false); }
    }
  }, [accessId, selectedModule]);
  useEffect(() => { void load(); return () => { requestId.current += 1; }; }, [load]);

  return <SafeAreaView style={s.page}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.back()} style={s.back}><Text style={s.backText}>‹</Text></Pressable><Text style={s.headerTitle}>{selectedModule ? names[selectedModule] : "Раздел"}</Text><View style={{ width: 42 }} /></View>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{selectedModule ? names[selectedModule] : "Раздел недоступен"}</Text>
      {selectedModule ? <Text style={s.copy}>{descriptions[selectedModule]}</Text> : null}
      {loading ? <ActivityIndicator color={colors.navy} /> : error ? <View style={s.card}><Text style={s.cardTitle}>Данные недоступны</Text><Text style={s.copy}>{error}</Text><Pressable onPress={() => void load()} style={s.smallButton}><Text style={s.smallButtonText}>Повторить</Text></Pressable></View> : <>
        <Text style={s.meta}>{level === "write" && selectedModule !== "analytics" ? "Владелец разрешил изменения" : "Только просмотр"}{records.length === 200 ? " · показаны первые 200 записей" : ""}</Text>
        {records.length ? records.map((record, index) => <StaffRecord key={`${field(record, "id") || index}-${field(record, "title")}-${field(record, "name")}-${field(record, "stock_qty")}-${field(record, "price")}-${field(record, "phone")}-${field(record, "is_active")}`} accessId={accessId!} module={selectedModule!} record={record} write={level === "write"} reload={load} />) : <View style={s.card}><Text style={s.cardTitle}>Записей пока нет</Text><Text style={s.copy}>Они появятся здесь после работы магазина.</Text></View>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function StaffRecord({ accessId, module, record, write, reload }: { accessId: string; module: Module; record: RecordData; write: boolean; reload: () => Promise<void> }) {
  const [title, setTitle] = useState(field(record, "title"));
  const [description, setDescription] = useState(field(record, "description"));
  const [price, setPrice] = useState(field(record, "price"));
  const [active, setActive] = useState(Boolean(record.is_active));
  const [quantity, setQuantity] = useState(field(record, "stock_qty"));
  const [name, setName] = useState(field(record, "name"));
  const [phone, setPhone] = useState(field(record, "phone"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setTitle(field(record, "title")); setDescription(field(record, "description"));
    setPrice(field(record, "price")); setActive(Boolean(record.is_active));
    setQuantity(field(record, "stock_qty")); setName(field(record, "name")); setPhone(field(record, "phone"));
    setError("");
  }, [record]);
  const save = async () => {
    if (!write || !supabase || saving) return;
    let data: Record<string, unknown>;
    if (module === "catalog") {
      if (title.trim().length < 2 || title.trim().length > 200 || description.length > 4000 || !/^\d{1,10}$/.test(price) || Number(price) > 2_000_000_000) { setError("Проверьте название, описание и цену."); return; }
      data = { title: title.trim(), description, price, active, expected_title: field(record, "title"), expected_price: field(record, "price") };
    } else if (module === "stock") {
      if (!/^\d{1,7}$/.test(quantity)) { setError("Укажите целое количество от 0 до 9 999 999."); return; }
      data = { quantity, expected: field(record, "stock_qty") };
    } else if (module === "customers") {
      if (!name.trim() || name.trim().length > 100 || phone.length < 7 || phone.length > 30) { setError("Проверьте имя и телефон."); return; }
      data = { name: name.trim(), phone, expected_phone: field(record, "phone") };
    } else return;
    setSaving(true); setError("");
    try {
      const result = await supabase.rpc("staff_edit" as never, { p_access: accessId, p_module: module, p_id: record.id, p_data: data } as never);
      if (result.error || result.data !== true) throw new Error("Не сохранено. Запись или ваши права изменились. Обновите раздел.");
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить."); }
    finally { setSaving(false); }
  };
  if (module === "analytics") return <View style={s.card}><Text style={s.cardTitle}>{field(record, "title")}</Text><Text style={s.copy}>{field(record, "count")} заказов · {money(Number(record.total ?? 0))}</Text><Text style={s.meta}>Статусы отражают отметки магазина, не банковскую выписку.</Text></View>;
  return <View style={s.card}>
    {module === "catalog" ? <><Text style={s.cardTitle}>Карточка товара</Text><LabeledInput label="Название" value={title} onChangeText={setTitle} editable={write} maxLength={200} /><LabeledInput label="Описание" value={description} onChangeText={setDescription} editable={write} maxLength={4000} multiline /><LabeledInput label="Цена, ₸" value={price} onChangeText={setPrice} editable={write} keyboardType="number-pad" /><View style={s.switchRow}><Text style={s.label}>Показывать покупателям</Text><Switch value={active} onValueChange={setActive} disabled={!write} trackColor={{ false: "#D7DEE3", true: colors.navy }} /></View></> : null}
    {module === "stock" ? <><Text style={s.cardTitle}>{field(record, "title")}</Text><Text style={s.meta}>{[field(record, "size"), field(record, "color")].filter(Boolean).join(" · ")}</Text><LabeledInput label="Фактический остаток" value={quantity} onChangeText={setQuantity} editable={write} keyboardType="number-pad" /><Text style={s.meta}>Исправление сохраняется в журнале движений.</Text></> : null}
    {module === "customers" ? <><Text style={s.cardTitle}>Контакт покупателя</Text><LabeledInput label="Имя" value={name} onChangeText={setName} editable={write} maxLength={100} /><LabeledInput label="Телефон" value={phone} onChangeText={setPhone} editable={write} keyboardType="phone-pad" maxLength={30} /><Text style={s.meta}>{field(record, "orders_count")} заказов</Text></> : null}
    {error ? <Text style={s.error}>{error}</Text> : null}
    {write ? <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={[s.button, saving && { opacity: 0.5 }]}>{saving ? <ActivityIndicator color="white" /> : <Text style={s.buttonText}>Сохранить</Text>}</Pressable> : null}
  </View>;
}

function LabeledInput({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) { return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput {...props} style={s.input} /></View>; }
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "white" }, header: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navySoft, alignItems: "center", justifyContent: "center" }, backText: { fontSize: 31, lineHeight: 34, color: colors.navyDark }, headerTitle: { fontSize: 16, fontWeight: "900", color: colors.ink }, content: { padding: 20, paddingBottom: 56, gap: 13 }, title: { fontSize: 30, fontWeight: "900", color: colors.ink }, copy: { fontSize: 14, lineHeight: 21, color: colors.muted }, meta: { fontSize: 12, lineHeight: 18, color: colors.muted }, card: { gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 17, backgroundColor: "white" }, cardTitle: { fontSize: 18, fontWeight: "900", color: colors.ink }, field: { gap: 6 }, label: { fontSize: 13, fontWeight: "800", color: colors.ink }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, color: colors.ink, fontSize: 15 }, switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, button: { minHeight: 48, borderRadius: 13, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }, buttonText: { color: "white", fontWeight: "900" }, smallButton: { alignSelf: "flex-start", backgroundColor: colors.navySoft, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10 }, smallButtonText: { color: colors.navyDark, fontWeight: "900" }, error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
});
