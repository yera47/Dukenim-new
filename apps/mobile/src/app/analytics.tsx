import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppScreen, ui } from "@/components/app-shell";
import { useOwnerStore } from "@/lib/use-owner-store";
import { colors, money } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Order = { id: string; status: string; payment_status: string; source: string; total: number; created_at: string };
type Period = { label: string; start: string; end: string; days: number };
type Report = { created: number; paid: number; pending: number; done: number; revenue: number; online: number; offline: number; daily: { day: string; amount: number }[] };
const DAY = 86_400_000;
const kzDay = (time: number) => new Date(time + 5 * 3_600_000).toISOString().slice(0, 10);
const validDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

function preset(days: 1 | 7 | 30): Period {
  const now = Date.now();
  const today = kzDay(now);
  const start = Date.parse(`${today}T00:00:00+05:00`) - (days - 1) * DAY;
  return { label: days === 1 ? "Сегодня" : `${days} дней`, start: new Date(start).toISOString(), end: new Date(now).toISOString(), days };
}
function custom(from: string, to: string): Period | null {
  if (!validDay(from) || !validDay(to)) return null;
  const first = Date.parse(`${from}T00:00:00+05:00`);
  const last = Date.parse(`${to}T00:00:00+05:00`);
  const days = Math.round((last - first) / DAY) + 1;
  if (days < 1 || days > 3660) return null;
  return { label: `${from} — ${to}`, start: new Date(first).toISOString(), end: new Date(last + DAY - 1).toISOString(), days };
}

async function loadReport(tenantId: string, period: Period): Promise<Report> {
  if (!supabase) throw new Error("Нет подключения к данным.");
  const report: Report = { created: 0, paid: 0, pending: 0, done: 0, revenue: 0, online: 0, offline: 0, daily: [] };
  const byDay = new Map<string, number>();
  let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    let query = supabase.from("orders").select("id,status,payment_status,source,total,created_at")
      .eq("tenant_id", tenantId).gte("created_at", period.start).lte("created_at", period.end)
      .order("id", { ascending: true }).limit(1000);
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query;
    if (error || !data) throw new Error("Не удалось загрузить все заказы.");
    for (const order of data as Order[]) {
      report.created++;
      if (order.payment_status === "pending" && order.status !== "cancelled") report.pending++;
      if (order.status === "done") report.done++;
      if (order.payment_status !== "paid" || order.status === "cancelled") continue;
      if (!Number.isSafeInteger(order.total) || order.total < 0) throw new Error("Некорректная сумма заказа.");
      report.paid++;
      report.revenue += order.total;
      if (order.source === "online") report.online += order.total;
      else report.offline += order.total;
      if (!Number.isSafeInteger(report.revenue)) throw new Error("Сумма превышает точность расчёта.");
      const day = kzDay(Date.parse(order.created_at));
      byDay.set(day, (byDay.get(day) ?? 0) + order.total);
    }
    if (data.length < 1000) {
      if (period.days <= 30) {
        const first = Date.parse(period.start);
        report.daily = Array.from({ length: period.days }, (_, index) => {
          const day = kzDay(first + index * DAY);
          return { day, amount: byDay.get(day) ?? 0 };
        });
      }
      return report;
    }
    cursor = data[data.length - 1].id;
  }
  throw new Error("Для этого объёма заказов нужен расширенный отчёт.");
}

export default function Analytics() {
  const { store, loading: storeLoading, error: storeError } = useOwnerStore();
  const [period, setPeriod] = useState<Period>(() => preset(7));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [rangeError, setRangeError] = useState("");
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    setReport(null);
    if (!store) { setLoading(false); return; }
    setLoading(true);
    setMessage("");
    try {
      const result = await loadReport(store.id, period);
      if (current === requestId.current) setReport(result);
    } catch (error) {
      if (current === requestId.current) setMessage(error instanceof Error ? error.message : "Не удалось рассчитать отчёт целиком.");
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [store, period]);
  useEffect(() => { void load(); }, [load]);
  const select = (days: 1 | 7 | 30) => { setFrom(""); setTo(""); setRangeError(""); setPeriod(preset(days)); };
  const applyCustom = () => {
    const next = custom(from.trim(), to.trim());
    if (!next) { setRangeError("Введите даты ГГГГ-ММ-ДД: от 1 дня до 10 лет, окончание не раньше начала."); return; }
    setRangeError("");
    setPeriod(next);
  };
  const max = Math.max(1, ...(report?.daily.map(day => day.amount) ?? []));

  return <AppScreen section="Аналитика" store={store?.name}>
    <Text style={ui.title}>Аналитика продаж</Text>
    <Text style={ui.subtitle}>Оплаченные заказы за выбранный период. Статус оплаты отмечает магазин; это не подтверждение банка. Возвраты и отмены не входят в выручку. Время: Казахстан, UTC+5.</Text>
    <View style={s.tabs}>{([1, 7, 30] as const).map(days => <Pressable key={days} onPress={() => select(days)} style={[s.tab, period.label === (days === 1 ? "Сегодня" : `${days} дней`) && s.tabOn]}><Text style={[s.tabText, period.label === (days === 1 ? "Сегодня" : `${days} дней`) && s.tabTextOn]}>{days === 1 ? "Сегодня" : `${days} дней`}</Text></Pressable>)}</View>
    <View style={ui.card}><Text style={ui.cardTitle}>Свой период</Text><Text style={ui.subtitle}>Укажите даты в формате ГГГГ-ММ-ДД.</Text><View style={s.dates}><View style={{ flex: 1 }}><Text style={ui.label}>С</Text><TextInput accessibilityLabel="Дата начала отчёта" value={from} onChangeText={setFrom} maxLength={10} placeholder="2026-09-01" keyboardType="numbers-and-punctuation" style={ui.input} /></View><View style={{ flex: 1 }}><Text style={ui.label}>По</Text><TextInput accessibilityLabel="Дата окончания отчёта" value={to} onChangeText={setTo} maxLength={10} placeholder="2026-09-30" keyboardType="numbers-and-punctuation" style={ui.input} /></View></View>{rangeError ? <Text style={ui.error}>{rangeError}</Text> : null}<Pressable onPress={applyCustom} style={ui.outline}><Text style={ui.outlineText}>Показать период</Text></Pressable></View>
    <View style={s.period}><Text style={s.periodText}>{period.label}</Text><Pressable onPress={() => void load()}><Text style={s.refresh}>Обновить ↻</Text></Pressable></View>
    {storeLoading || loading ? <ActivityIndicator color={colors.navy} /> : null}
    {storeError ? <Text style={ui.error}>Не удалось открыть магазин. Вернитесь в кабинет и повторите.</Text> : null}
    {message ? <View style={ui.card}><Text style={ui.error}>{message}</Text><Text style={ui.subtitle}>Нули не показываются, пока отчёт не загружен целиком.</Text></View> : null}
    {report && !loading ? <>
      <View style={s.hero}><Text style={s.heroLabel}>ОПЛАЧЕНО ПО ЗАКАЗАМ</Text><Text style={s.heroNumber}>{money(report.revenue)}</Text><Text style={s.heroMeta}>{report.paid} оплаченных заказов · подтверждено магазином вручную</Text></View>
      <View style={s.grid}><Metric label="Создано заказов" value={String(report.created)} /><Metric label="Ожидают оплаты" value={String(report.pending)} /><Metric label="Средний чек" value={money(report.paid ? Math.round(report.revenue / report.paid) : 0)} /><Metric label="Завершены" value={String(report.done)} /><Metric label="Онлайн-заказы" value={money(report.online)} /><Metric label="В магазине" value={money(report.offline)} /></View>
      {report.daily.length ? <View style={ui.card}><Text style={ui.cardTitle}>Динамика по дням</Text>{report.daily.map(day => <View key={day.day} style={s.day}><Text style={s.dayLabel}>{day.day.slice(8)}.{day.day.slice(5, 7)}</Text><View style={s.barTrack}><View style={[s.bar, { width: `${day.amount / max * 100}%` }]} /></View><Text style={s.dayAmount}>{money(day.amount)}</Text></View>)}</View> : null}
    </> : null}
  </AppScreen>;
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={s.metric}><Text style={s.value}>{value}</Text><Text style={s.label}>{label}</Text></View>; }
const s = StyleSheet.create({ tabs: { flexDirection: "row", gap: 7 }, tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line }, tabOn: { backgroundColor: colors.navy, borderColor: colors.navy }, tabText: { fontSize: 12, fontWeight: "800", color: colors.ink }, tabTextOn: { color: "white" }, dates: { flexDirection: "row", gap: 10 }, period: { flexDirection: "row", justifyContent: "space-between" }, periodText: { color: colors.ink, fontWeight: "900" }, refresh: { color: colors.navy, fontWeight: "800" }, hero: { borderRadius: 22, backgroundColor: colors.navyDark, padding: 22, gap: 7 }, heroLabel: { color: "#E7D4E0", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 }, heroNumber: { color: "white", fontSize: 31, fontWeight: "900" }, heroMeta: { color: "#E7D4E0", fontSize: 12 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, metric: { width: "48%", minHeight: 104, borderWidth: 1, borderColor: colors.line, borderRadius: 19, padding: 16, backgroundColor: "white", justifyContent: "center" }, value: { fontSize: 20, fontWeight: "900", color: colors.ink }, label: { marginTop: 6, color: colors.muted, fontSize: 12 }, day: { flexDirection: "row", alignItems: "center", gap: 8 }, dayLabel: { width: 41, color: colors.muted, fontSize: 11 }, barTrack: { flex: 1, height: 9, borderRadius: 5, backgroundColor: colors.navySoft, overflow: "hidden" }, bar: { height: 9, borderRadius: 5, backgroundColor: colors.navy }, dayAmount: { width: 75, textAlign: "right", fontSize: 11, color: colors.ink, fontWeight: "800" } });
