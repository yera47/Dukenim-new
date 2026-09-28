import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { Image as ExpoImage } from "expo-image";
import { colors, site } from "@/lib/theme";
import { loadOwnerContext } from "@/lib/owner";
import { supabase } from "@/lib/supabase";
import logoMark from "../../assets/images/logo-mark-compact.png";
import { AppleSignInButton } from "@/components/apple-sign-in-button";
import { linkAppleToCurrentUser } from "@/lib/social-auth";
import { disableCurrentDevicePush } from "@/lib/notifications";
import { clearOrdersWidget } from "@/widgets/orders-widget";

type Store = { id: string; name: string; slug: string; status: string; catalog_published: boolean };
type Dashboard = { stores: Store[]; totals: { stores: number; newOrders: number; openRequests: number } };
type SalesLead = { id: string; zone_id: string; name: string; address: string; segment: string; status: string; notes: string; next_action: string; phone: string | null };
type SalesData = { zones: { id: string; name: string }[]; zoneId: string | null; leads: SalesLead[] };
type Tab = "overview" | "stores" | "sales" | "system";
const nav: { key: Tab; title: string; icon: string }[] = [
  { key: "overview", title: "Обзор", icon: "◫" }, { key: "stores", title: "Магазины", icon: "▣" },
  { key: "sales", title: "Выезды", icon: "⌁" }, { key: "system", title: "Система", icon: "⚙" },
];
const salesStatuses = [
  { value: "new", label: "Новая" }, { value: "planned", label: "В маршрут" }, { value: "contacted", label: "Связались" },
  { value: "negotiating", label: "Переговоры" }, { value: "demo", label: "Показ" }, { value: "follow_up", label: "Вернуться" },
  { value: "won", label: "Подключён" }, { value: "lost", label: "Отказ" }, { value: "do_not_contact", label: "Не беспокоить" },
];

export default function Root() {
  const [tab, setTab] = useState<Tab>("overview");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [hasMerchantStore, setHasMerchantStore] = useState(false);
  const [appleLinked, setAppleLinked] = useState(false);
  const [linkingApple, setLinkingApple] = useState(false);
  const [sales, setSales] = useState<SalesData | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState("");
  const [openedLead, setOpenedLead] = useState<string | null>(null);
  const [leadStatus, setLeadStatus] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [leadNext, setLeadNext] = useState("");
  const [savingLead, setSavingLead] = useState(false);
  const [mapToken, setMapToken] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(""); setDashboard(null); setSelected([]);
    try {
      if (!supabase) throw new Error("Подключение недоступно.");
      const context = await loadOwnerContext();
      if (context.role !== "superadmin") { router.replace("/" as never); return; }
      setHasMerchantStore(context.stores.length > 0);
      const { data: auth, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !auth.session) throw new Error("Войдите снова.");
      const identities = await supabase.auth.getUserIdentities();
      if (identities.error) throw new Error("Не удалось проверить способы входа.");
      setAppleLinked(identities.data.identities.some(identity => identity.provider === "apple"));
      const response = await fetch(`${site}/api/mobile/root`, { headers: { Authorization: `Bearer ${auth.session.access_token}` } });
      const data = await response.json() as Dashboard & { error?: string };
      if (!response.ok || !Array.isArray(data.stores)) throw new Error(data.error || "Не удалось загрузить платформу.");
      setDashboard(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось загрузить платформу."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const loadSales = useCallback(async (zone?: string) => {
    setSalesLoading(true); setSalesError(""); setSales(null); setOpenedLead(null);
    try {
      if (!supabase) throw new Error("Подключение недоступно.");
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) throw new Error("Войдите снова.");
      setMapToken(auth.session.access_token);
      const url = `${site}/api/mobile/root/sales${zone ? `?zone=${encodeURIComponent(zone)}` : ""}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${auth.session.access_token}` } });
      const body = await response.json() as SalesData & { error?: string };
      if (!response.ok || !Array.isArray(body.zones) || !Array.isArray(body.leads)) throw new Error(body.error || "База выездов не загружена.");
      setSales(body);
    } catch (cause) { setSalesError(cause instanceof Error ? cause.message : "База выездов не загружена."); }
    finally { setSalesLoading(false); }
  }, []);
  useEffect(() => { if (tab === "sales" && dashboard && !sales && !salesError && !salesLoading) void loadSales(); }, [tab, dashboard, sales, salesError, salesLoading, loadSales]);

  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 20 ? [...current, id] : current);
  const remove = async () => {
    if (!supabase || !dashboard || deleting || selected.length < 2 || reason.trim().length < 3 || confirmation !== `УДАЛИТЬ ${selected.length}`) {
      Alert.alert("Проверьте выбор", "Нужны 2–20 магазинов, причина и точная фраза подтверждения."); return;
    }
    const stores = selected.map(id => dashboard.stores.find(store => store.id === id)).filter((store): store is Store => Boolean(store));
    if (stores.length !== selected.length) { Alert.alert("Список изменился", "Обновите страницу."); return; }
    Alert.alert("Удалить безвозвратно?", stores.map(store => `${store.name} · /s/${store.slug}`).join("\n"), [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: async () => {
        setDeleting(true);
        try {
          const client = supabase;
          if (!client) throw new Error("Подключение недоступно.");
          const { data: auth } = await client.auth.getSession();
          if (!auth.session) throw new Error("Войдите снова.");
          const response = await fetch(`${site}/api/mobile/root/stores/delete`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.session.access_token}` }, body: JSON.stringify({ stores: stores.map(({ id, slug }) => ({ id, slug })), reason: reason.trim(), confirmation }) });
          const body = await response.json() as { deleted?: number; error?: string };
          if (!response.ok || body.deleted !== stores.length) throw new Error(body.error || "Магазины не удалены.");
          setReason(""); setConfirmation(""); await load();
          Alert.alert("Удалено", `Удалено магазинов: ${body.deleted}`);
        } catch (cause) { Alert.alert("Удаление не выполнено", cause instanceof Error ? cause.message : "Повторите позже."); }
        finally { setDeleting(false); }
      } },
    ]);
  };
  const filtered = dashboard?.stores.filter(store => `${store.name} ${store.slug}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  const linkApple = async () => { setLinkingApple(true); try { const linked = await linkAppleToCurrentUser(); if (linked) { setAppleLinked(true); Alert.alert("Apple ID привязан", "Теперь этот Apple ID ведёт в тот же админ-аккаунт."); } } catch (cause) { Alert.alert("Привязка не завершена", cause instanceof Error ? cause.message : "Повторите позже."); } finally { setLinkingApple(false); } };
  const signOut = () => Alert.alert("Выйти из Dukenim?", "Сессия на этом устройстве завершится.", [{ text: "Отмена", style: "cancel" }, { text: "Выйти", style: "destructive", onPress: async () => { try { if (!supabase) throw new Error(); await disableCurrentDevicePush(); const result = await supabase.auth.signOut(); if (result.error) throw result.error; clearOrdersWidget(); router.replace("/"); } catch { Alert.alert("Не удалось выйти", "Проверьте соединение и повторите."); } } }]);
  const editLead = (lead: SalesLead) => { setOpenedLead(lead.id); setLeadStatus(lead.status); setLeadNotes(lead.notes ?? ""); setLeadNext(lead.next_action ?? ""); };
  const saveLead = async () => {
    if (!openedLead || !supabase || savingLead) return;
    setSavingLead(true);
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) throw new Error("Войдите снова.");
      const response = await fetch(`${site}/api/mobile/root/sales`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.session.access_token}` }, body: JSON.stringify({ leadId: openedLead, status: leadStatus, notes: leadNotes, nextAction: leadNext }) });
      const body = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok || !body.saved) throw new Error(body.error || "Точка не сохранена.");
      await loadSales(sales?.zoneId ?? undefined);
      Alert.alert("Сохранено", "Изменения видны в веб-кабинете.");
    } catch (cause) { Alert.alert("Не сохранено", cause instanceof Error ? cause.message : "Повторите позже."); }
    finally { setSavingLead(false); }
  };
  return <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
    <View style={s.header}><View style={s.mark}><Image source={logoMark} resizeMode="contain" style={s.logo} alt="" /></View><View><Text style={s.eyebrow}>DUKENIM HQ</Text><Text style={s.headerTitle}>Администратор</Text></View></View>
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
      {loading ? <ActivityIndicator color={colors.navy} /> : error ? <View style={s.card}><Text style={s.error}>{error}</Text><Pressable onPress={() => void load()} style={s.button}><Text style={s.buttonText}>Повторить</Text></Pressable></View> : null}
      {dashboard && tab === "overview" ? <>
        <Text style={s.title}>Вся платформа</Text><Text style={s.muted}>Данные сайта и приложения синхронизируются через одну базу.</Text>
        <View style={s.metrics}><Metric title="Магазины" value={dashboard.totals.stores} /><Metric title="Новые заказы" value={dashboard.totals.newOrders} /><Metric title="Обращения" value={dashboard.totals.openRequests} /></View>
        <Action title="Магазины" copy="Реестр, состояние и массовый выбор" onPress={() => setTab("stores")} />
        <Action title="Заказы платформы" copy="Статусы и суммы из заказов магазинов" onPress={() => router.push("/root-orders" as never)} />
        <Action title="Выездные продажи" copy="Зоны, лиды и маршруты Астаны" onPress={() => setTab("sales")} />
        {hasMerchantStore ? <Action title="Мой магазин" copy="Вернуться в рабочий кабинет продавца" onPress={() => router.replace("/more" as never)} /> : null}
      </> : null}
      {dashboard && tab === "stores" ? <>
        <Text style={s.title}>Магазины</Text><Text style={s.muted}>Выберите несколько пустых магазинов для удаления. Наличие данных проверяет сервер.</Text>
        <TextInput style={s.input} placeholder="Найти по названию или адресу" value={search} onChangeText={setSearch} />
        <Text style={s.eyebrow}>НАЙДЕНО {filtered.length} · ВЫБРАНО {selected.length}</Text>
        {filtered.map(store => <View key={store.id} style={s.storeRow}><Pressable onPress={() => toggle(store.id)} accessibilityRole="checkbox" accessibilityLabel={`Выбрать ${store.name}`} accessibilityState={{ checked: selected.includes(store.id) }} style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}><Text style={s.checkbox}>{selected.includes(store.id) ? "✓" : ""}</Text><View style={{ flex: 1 }}><Text style={s.storeName}>{store.name}</Text><Text style={s.muted}>/s/{store.slug} · {store.status}</Text></View></Pressable><Pressable onPress={() => router.push({ pathname: "/root-store", params: { id: store.id } } as never)} accessibilityRole="button" accessibilityLabel={`Открыть ${store.name}`} style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.navy, fontSize: 24 }}>›</Text></Pressable></View>)}
        {selected.length >= 2 ? <View style={s.dangerCard}><Text style={s.dangerTitle}>Удалить выбранные ({selected.length})</Text><Text style={s.muted}>Это необратимо. Магазины с товарами, заказами, клиентами или финансовой историей не удалятся.</Text><TextInput style={s.input} placeholder="Причина удаления" value={reason} onChangeText={setReason} maxLength={1000} /><TextInput style={s.input} placeholder={`Введите УДАЛИТЬ ${selected.length}`} value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" /><Pressable disabled={deleting} onPress={() => void remove()} style={s.deleteButton}><Text style={s.buttonText}>{deleting ? "Проверяем…" : "Проверить и удалить"}</Text></Pressable></View> : null}
      </> : null}
      {dashboard && tab === "sales" ? <><Text style={s.title}>Выездные продажи</Text><Text style={s.muted}>Зоны и точки из той же базы, что и на сайте. Этап, заметка и следующий шаг сохраняются для команды.</Text>
        {salesLoading ? <ActivityIndicator color={colors.navy} /> : null}
        {salesError ? <View style={s.card}><Text style={s.error}>{salesError}</Text><Pressable onPress={() => void loadSales(sales?.zoneId ?? undefined)} style={s.button}><Text style={s.buttonText}>Повторить</Text></Pressable></View> : null}
        {sales ? <><Text style={s.eyebrow}>ЗОНА · {sales.zoneId ?? "—"}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{sales.zones.map(zone => <Pressable key={zone.id} onPress={() => void loadSales(zone.id)} style={[s.zoneChip, sales.zoneId === zone.id && s.zoneChipActive]}><Text style={[s.zoneText, sales.zoneId === zone.id && s.zoneTextActive]}>{zone.id} · {zone.name}</Text></Pressable>)}</ScrollView>{sales.zoneId && mapToken ? <ExpoImage source={{ uri: `${site}/api/mobile/root/sales/map?zone=${encodeURIComponent(sales.zoneId)}`, headers: { Authorization: `Bearer ${mapToken}` } }} style={{ width: "100%", height: 210, borderRadius: 16, backgroundColor: colors.navySoft }} contentFit="cover" accessibilityLabel={`Карта 2ГИС зоны ${sales.zoneId}`} /> : null}<Text style={s.muted}>Точек в выбранной зоне: {sales.leads.length}</Text>
          {sales.leads.map(lead => <View key={lead.id} style={s.card}><Pressable onPress={() => openedLead === lead.id ? setOpenedLead(null) : editLead(lead)}><Text style={s.storeName}>{lead.name} →</Text><Text style={s.muted}>{lead.segment} · {lead.address || "Адрес уточняется"}</Text><Text style={s.eyebrow}>{salesStatuses.find(item => item.value === lead.status)?.label ?? lead.status}</Text></Pressable>{openedLead === lead.id ? <><Text style={s.eyebrow}>ЭТАП ПЕРЕГОВОРОВ</Text><ScrollView horizontal contentContainerStyle={{ gap: 6 }}>{salesStatuses.map(item => <Pressable key={item.value} onPress={() => setLeadStatus(item.value)} style={[s.zoneChip, leadStatus === item.value && s.zoneChipActive]}><Text style={[s.zoneText, leadStatus === item.value && s.zoneTextActive]}>{item.label}</Text></Pressable>)}</ScrollView><TextInput style={[s.input, { minHeight: 90 }]} multiline placeholder="Что обсудили" value={leadNotes} onChangeText={setLeadNotes} /><TextInput style={s.input} placeholder="Следующий шаг" value={leadNext} onChangeText={setLeadNext} /><Pressable disabled={savingLead} onPress={() => void saveLead()} style={s.button}><Text style={s.buttonText}>{savingLead ? "Сохраняем…" : "Сохранить точку"}</Text></Pressable></> : null}</View>)}
        </> : null}</> : null}
      {dashboard && tab === "system" ? <><Text style={s.title}>Система</Text><Text style={s.muted}>Разделы платформы переносятся из веб-кабинета. Здесь показаны только подключённые действия.</Text><Action title="Аккаунты платформы" copy="Роли, магазины и статус входа" onPress={() => router.push("/root-accounts" as never)} /><Action title="Заказы платформы" copy="Поиск и проверка статусов" onPress={() => router.push("/root-orders" as never)} /><Action title="Финансовые записи" copy="Подписки и заявки без выдуманной сверки" onPress={() => router.push({ pathname: "/root-records" as never, params: { section: "finance" } })} /><Action title="Аудит платформы" copy="Последние действия с причинами" onPress={() => router.push({ pathname: "/root-records" as never, params: { section: "audit" } })} /><View style={s.card}><Text style={s.storeName}>Apple ID</Text><Text style={s.muted}>{appleLinked ? "Привязан к текущему админ-аккаунту" : "Войдите через Google или пароль в этот аккаунт, затем привяжите Apple ID здесь."}</Text>{!appleLinked ? <AppleSignInButton onPress={() => void linkApple()} pending={linkingApple} /> : null}</View>{hasMerchantStore ? <Action title="Мой магазин" copy="Каталог, заказы и AI Studio" onPress={() => router.replace("/more" as never)} /> : null}<Action title="Обновить данные" copy="Прочитать актуальное состояние" onPress={() => void load()} /><Action title="Выйти" copy="Завершить сессию на этом устройстве" onPress={signOut} /></> : null}
    </ScrollView>
    <GlassView glassEffectStyle="regular" tintColor="#F9F3F7DD" style={s.nav}>{nav.map(item => <Pressable key={item.key} onPress={() => setTab(item.key)} style={[s.tab, tab === item.key && s.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }}><Text style={s.navIcon}>{item.icon}</Text><Text style={s.navText}>{item.title}</Text></Pressable>)}</GlassView>
  </SafeAreaView>;
}

function Metric({ title, value }: { title: string; value: number }) { return <View style={s.metric}><Text style={s.metricValue}>{value}</Text><Text style={s.muted}>{title}</Text></View>; }
function Action({ title, copy, onPress }: { title: string; copy: string; onPress: () => void }) { return <Pressable onPress={onPress} style={s.card}><Text style={s.storeName}>{title} →</Text><Text style={s.muted}>{copy}</Text></Pressable>; }
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: "white" }, header: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line }, mark: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: "white", alignItems: "center", justifyContent: "center" }, logo: { width: 25, height: 27 }, eyebrow: { color: colors.navy, fontSize: 10, fontWeight: "900", letterSpacing: 1.3 }, headerTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" }, body: { padding: 20, paddingBottom: 110, gap: 13 }, title: { fontSize: 32, fontWeight: "900", color: colors.ink }, muted: { color: colors.muted, fontSize: 13, lineHeight: 19 }, metrics: { flexDirection: "row", gap: 8 }, metric: { flex: 1, minHeight: 90, padding: 11, borderRadius: 16, backgroundColor: colors.navySoft, gap: 5 }, metricValue: { fontSize: 24, fontWeight: "900", color: colors.navyDark }, card: { padding: 18, borderRadius: 20, borderWidth: 1, borderColor: colors.line, gap: 5, backgroundColor: "white" }, storeRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 70, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: "white" }, storeName: { fontSize: 16, fontWeight: "800", color: colors.ink }, checkbox: { width: 23, height: 23, borderRadius: 7, borderWidth: 1, borderColor: colors.navy, textAlign: "center", color: colors.navy, fontWeight: "900" }, input: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: "white", paddingHorizontal: 13, color: colors.ink }, zoneChip: { minHeight: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: "white", justifyContent: "center" }, zoneChipActive: { borderColor: colors.navy, backgroundColor: colors.navySoft }, zoneText: { color: colors.muted, fontWeight: "700", fontSize: 12 }, zoneTextActive: { color: colors.navyDark }, dangerCard: { padding: 16, borderRadius: 18, backgroundColor: "#FFF6F6", borderWidth: 1, borderColor: "#F1CACA", gap: 12 }, dangerTitle: { color: "#8B2424", fontWeight: "900", fontSize: 17 }, deleteButton: { minHeight: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", backgroundColor: "#8B2424" }, button: { minHeight: 48, borderRadius: 12, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }, buttonText: { color: "white", fontWeight: "900" }, error: { color: colors.danger }, nav: { position: "absolute", bottom: 10, left: 12, right: 12, height: 72, flexDirection: "row", padding: 5, borderRadius: 28, borderWidth: 1, borderColor: "#FFFFFFCC" }, tab: { flex: 1, justifyContent: "center", alignItems: "center", borderRadius: 22, gap: 2 }, tabActive: { backgroundColor: "#F2E7EFC7" }, navIcon: { color: colors.navy, fontSize: 20, fontWeight: "800" }, navText: { color: colors.navyDark, fontSize: 10, fontWeight: "800" } });
