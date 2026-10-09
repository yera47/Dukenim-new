import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { router, useLocalSearchParams } from "expo-router";
import { EditorScreen } from "@/components/editor-screen";
import { ui } from "@/components/app-shell";
import { useOwnerStore } from "@/lib/use-owner-store";
import { colors, site } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { campaignHorizons, campaignIdeaBrief, campaignMonthLabel, getCampaignPlanningMonths, type CampaignHorizon } from "../../../../src/lib/campaign-calendar";

type Campaign = { id: string; title: string; eyebrow: string | null; body: string | null; cta_label: string; status: "draft" | "published" | "archived"; image_url: string | null; starts_at: string | null; ends_at: string | null };
type AiDraft = { eyebrow?: string; title: string; body: string; ctaLabel: string };
type CampaignResponse = { canManage?: boolean; campaigns?: Campaign[]; error?: string };

export default function Campaigns() {
  const { store } = useOwnerStore();
  const params = useLocalSearchParams<{ brief?: string }>();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiBrief, setAiBrief] = useState("");
  const [proposal, setProposal] = useState<AiDraft | null>(null);
  const [title, setTitle] = useState("");
  const [eyebrow, setEyebrow] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Смотреть");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [periodDraft, setPeriodDraft] = useState({ startsAt: "", endsAt: "" });
  const [horizon, setHorizon] = useState<CampaignHorizon>(1);
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);

  useEffect(() => { if (typeof params.brief === "string") setAiBrief(params.brief.slice(0, 800)); }, [params.brief]);
  const request = useCallback(async (path: string, method: "GET" | "POST" | "PATCH", payload?: Record<string, string | null>) => {
    if (!supabase) throw new Error("Подключение недоступно.");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Войдите в аккаунт заново.");
    const response = await fetch(`${site}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
      cache: "no-store",
    });
    const result = await response.json() as CampaignResponse;
    if (!response.ok) throw new Error(result.error ?? "Не удалось выполнить действие.");
    return result;
  }, []);

  const load = useCallback(async () => {
    if (!store) { setLoading(false); return; }
    setLoading(true);
    setLoadError(false);
    try {
      const result = await request(`/api/mobile/campaigns?tenantId=${encodeURIComponent(store.id)}`, "GET");
      setPremiumRequired(!result.canManage);
      setRows(result.campaigns ?? []);
    } catch (error) {
      setLoadError(true);
      Alert.alert("Не удалось загрузить акции", error instanceof Error ? error.message : "Проверьте подключение.");
    } finally { setLoading(false); }
  }, [request, store]);
  useEffect(() => { void load(); }, [load]);

  const propose = async () => {
    if (!store || !supabase || aiBrief.trim().length < 8 || aiBusy) return;
    setAiBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${site}/api/mobile/ai-promotion`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ tenantId: store.id, brief: aiBrief.trim() }),
      });
      const result = await response.json() as { draft?: AiDraft; error?: string };
      if (!response.ok || !result.draft) throw new Error(result.error ?? "Не удалось подготовить текст.");
      setProposal(result.draft);
    } catch (error) { Alert.alert("AI Studio", error instanceof Error ? error.message : "Не удалось подготовить текст."); }
    finally { setAiBusy(false); }
  };
  const useProposal = () => {
    if (!proposal) return;
    setTitle(proposal.title); setEyebrow(proposal.eyebrow ?? ""); setBody(proposal.body); setCtaLabel(proposal.ctaLabel); setProposal(null);
  };
  const toIsoDate = (value: string, end = false) => {
    if (!value.trim()) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return undefined;
    const date = new Date(`${value.trim()}T${end ? "23:59:59.999" : "00:00:00.000"}+05:00`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value.trim() ? date.toISOString() : undefined;
  };
  const dateInput = (value: string | null) => {
    if (!value) return "";
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
    const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  };
  const dateLabel = (value: string | null) => value ? new Date(value).toLocaleDateString("ru-KZ", { timeZone: "Asia/Almaty" }) : "без ограничения";
  const planningMonths = getCampaignPlanningMonths(horizon, store?.business_vertical);
  const selectIdea = (idea: typeof planningMonths[number]) => {
    setSelectedIdea(idea.key);
    setTitle(idea.title);
    setEyebrow(campaignMonthLabel(idea.key));
    setStartsAt(idea.startsAt);
    setEndsAt(idea.endsAt);
    setAiBrief(campaignIdeaBrief(store?.name ?? "Мой магазин", idea));
  };
  const create = async () => {
    if (!store || title.trim().length < 2) return Alert.alert("Добавьте заголовок", "Минимум два символа.");
    const starts = toIsoDate(startsAt), ends = toIsoDate(endsAt, true);
    if (starts === undefined || ends === undefined) return Alert.alert("Проверьте даты", "Укажите дату в формате ГГГГ-ММ-ДД.");
    if (starts && ends && new Date(ends) <= new Date(starts)) return Alert.alert("Проверьте период", "Окончание должно быть позже начала.");
    setSaving(true);
    try {
      await request("/api/mobile/campaigns", "POST", { tenantId: store.id, title: title.trim(), eyebrow: eyebrow.trim(), body: body.trim(), ctaLabel: ctaLabel.trim() || "Смотреть", startsAt: starts ?? null, endsAt: ends ?? null });
      setTitle(""); setEyebrow(""); setBody(""); setCtaLabel("Смотреть"); setStartsAt(""); setEndsAt(""); await load();
    } catch (error) { Alert.alert("Акция не сохранена", error instanceof Error ? error.message : "Попробуйте ещё раз."); }
    finally { setSaving(false); }
  };
  const setStatus = async (row: Campaign, status: Campaign["status"]) => {
    if (!store) return;
    try { await request("/api/mobile/campaigns", "PATCH", { tenantId: store.id, campaignId: row.id, status }); await load(); }
    catch (error) { Alert.alert("Статус не изменён", error instanceof Error ? error.message : "Попробуйте ещё раз."); }
  };
  const editPeriod = (row: Campaign) => {
    setPeriodDraft({ startsAt: dateInput(row.starts_at), endsAt: dateInput(row.ends_at) });
    setEditingPeriod(row.id);
  };
  const savePeriod = async (row: Campaign) => {
    if (!store) return;
    const starts = toIsoDate(periodDraft.startsAt), ends = toIsoDate(periodDraft.endsAt, true);
    if (starts === undefined || ends === undefined) return Alert.alert("Проверьте даты", "Укажите дату в формате ГГГГ-ММ-ДД.");
    if (starts && ends && new Date(ends) <= new Date(starts)) return Alert.alert("Проверьте период", "Окончание должно быть позже начала.");
    try {
      await request("/api/mobile/campaigns", "PATCH", { tenantId: store.id, campaignId: row.id, status: row.status, startsAt: starts, endsAt: ends });
      setEditingPeriod(null);
      await load();
    } catch (error) { Alert.alert("Период не сохранён", error instanceof Error ? error.message : "Попробуйте ещё раз."); }
  };

  return <EditorScreen title="Акции" subtitle={store?.name}>
    <Text style={ui.title}>Оформление к датам</Text>
    <Text style={ui.subtitle}>Подготовьте предложение, проверьте текст и отдельно решите, когда показать его покупателям.</Text>
    {loading ? <ActivityIndicator color={colors.navy} /> : loadError ? <View style={ui.card}><Text style={ui.cardTitle}>Не удалось проверить тариф и акции</Text><Text style={ui.subtitle}>Чтобы не открыть действия без проверки прав, повторите загрузку.</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={ui.button}><Text style={ui.buttonText}>Повторить</Text></Pressable></View> : premiumRequired ? <View style={ui.card}>
      <Text style={s.eyebrow}>PREMIUM</Text>
      <Text style={ui.cardTitle}>Акции и сезонные предложения</Text>
      <Text style={ui.subtitle}>Создавайте кампании, например к празднику или запуску коллекции. AI предложит текст по вашим условиям, а вы сами проверите и опубликуете его. Витрина не меняется без вашего действия.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push("/plan" as never)} style={ui.button}><Text style={ui.buttonText}>Посмотреть Premium</Text></Pressable>
    </View> : <>
      <View style={ui.card}>
        <Text style={s.eyebrow}>ПЛАНИРОВАНИЕ · PREMIUM</Text>
        <Text style={ui.cardTitle}>План акций по месяцам</Text>
        <Text style={ui.subtitle}>Выберите горизонт и идею. Это сезонные темы для планирования, не список официальных праздников.</Text>
        <View style={s.horizons}>{campaignHorizons.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: horizon === value }} onPress={() => setHorizon(value)} style={[s.horizon, horizon === value && s.horizonSelected]}><Text style={[s.horizonText, horizon === value && s.horizonTextSelected]}>{value} {value === 1 ? "месяц" : value < 5 ? "месяца" : "месяцев"}</Text></Pressable>)}</View>
        {planningMonths.map(idea => <View key={idea.key} style={s.ideaRow}>
          <View style={s.ideaCopy}><Text style={s.ideaMonth}>{campaignMonthLabel(idea.key)}</Text><Text style={s.ideaTitle}>{idea.title}</Text><Text style={s.ideaSubtitle}>{idea.subtitle}</Text></View>
          <Pressable accessibilityRole="button" onPress={() => selectIdea(idea)} style={[s.ideaButton, selectedIdea === idea.key && s.ideaButtonSelected]}><Text style={[s.ideaButtonText, selectedIdea === idea.key && s.ideaButtonTextSelected]}>{selectedIdea === idea.key ? "Выбрано" : "В план"}</Text></Pressable>
        </View>)}
        {selectedIdea ? <Text style={ui.subtitle}>Идея и даты добавлены в форму ниже. Нажмите «Предложить текст», затем проверьте и сохраните черновик сами.</Text> : null}
      </View>
      <View style={ui.card}>
        <Text style={ui.cardTitle}>Черновик с AI</Text>
        <Text style={ui.subtitle}>Опишите товары и точные условия. AI не придумает скидку, срок или наличие.</Text>
        <TextInput style={[ui.input, s.multiline]} value={aiBrief} onChangeText={setAiBrief} multiline maxLength={800} placeholder="Например: предложение на выпечку по пятницам; условия уточню перед публикацией" />
        <Pressable accessibilityRole="button" disabled={aiBusy || aiBrief.trim().length < 8} onPress={() => void propose()} style={[ui.button, (aiBusy || aiBrief.trim().length < 8) && s.disabled]}>
          <Text style={ui.buttonText}>{aiBusy ? "Подготовка…" : "Предложить текст"}</Text>
        </Pressable>
      </View>
      {proposal ? <View style={ui.card}>
        <Text style={s.eyebrow}>ПРЕДЛОЖЕНИЕ · НЕ СОХРАНЕНО</Text><Text style={ui.cardTitle}>{proposal.title}</Text>
        <Text style={ui.subtitle}>{proposal.body}</Text><Text style={ui.subtitle}>Кнопка: {proposal.ctaLabel}</Text>
        <Pressable accessibilityRole="button" onPress={useProposal} style={ui.button}><Text style={ui.buttonText}>Вставить в черновик</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setProposal(null)} style={ui.outline}><Text style={ui.outlineText}>Отклонить</Text></Pressable>
      </View> : null}
      <View style={ui.card}>
        <Text style={ui.cardTitle}>Новая кампания</Text>
        <TextInput style={ui.input} value={title} onChangeText={setTitle} maxLength={90} placeholder="Название предложения" />
        <TextInput style={ui.input} value={eyebrow} onChangeText={setEyebrow} maxLength={40} placeholder="Короткая метка · необязательно" />
        <TextInput style={[ui.input, s.multiline]} value={body} onChangeText={setBody} multiline maxLength={300} placeholder="Что получает покупатель и на каких условиях" />
        <TextInput style={ui.input} value={ctaLabel} onChangeText={setCtaLabel} maxLength={40} placeholder="Текст кнопки" />
        <Text style={ui.subtitle}>Период показа · необязательно</Text>
        <TextInput style={ui.input} value={startsAt} onChangeText={setStartsAt} keyboardType="numbers-and-punctuation" maxLength={10} placeholder="Начало · ГГГГ-ММ-ДД" />
        <TextInput style={ui.input} value={endsAt} onChangeText={setEndsAt} keyboardType="numbers-and-punctuation" maxLength={10} placeholder="Окончание · ГГГГ-ММ-ДД" />
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => void create()} style={[ui.button, saving && s.disabled]}><Text style={ui.buttonText}>{saving ? "Сохраняем…" : "Сохранить черновик"}</Text></Pressable>
      </View>
      {rows.map(row => <View key={row.id} style={ui.card}>
        <Text style={s.eyebrow}>{row.eyebrow || "КАМПАНИЯ"}</Text><Text style={ui.cardTitle}>{row.title}</Text>
        {row.body ? <Text style={ui.subtitle}>{row.body}</Text> : null}
        <Text style={ui.subtitle}>Период: {dateLabel(row.starts_at)} — {dateLabel(row.ends_at)}</Text>
        {editingPeriod === row.id ? <>
          <TextInput style={ui.input} value={periodDraft.startsAt} onChangeText={value => setPeriodDraft(current => ({ ...current, startsAt: value }))} keyboardType="numbers-and-punctuation" maxLength={10} placeholder="Начало · ГГГГ-ММ-ДД" />
          <TextInput style={ui.input} value={periodDraft.endsAt} onChangeText={value => setPeriodDraft(current => ({ ...current, endsAt: value }))} keyboardType="numbers-and-punctuation" maxLength={10} placeholder="Окончание · ГГГГ-ММ-ДД" />
          <Pressable onPress={() => void savePeriod(row)} style={ui.button}><Text style={ui.buttonText}>Сохранить период</Text></Pressable>
          <Pressable onPress={() => setEditingPeriod(null)} style={ui.outline}><Text style={ui.outlineText}>Отмена</Text></Pressable>
        </> : <Pressable onPress={() => editPeriod(row)} style={ui.outline}><Text style={ui.outlineText}>Изменить период</Text></Pressable>}
        <Text style={s.status}>{row.status === "published" ? "Опубликована" : row.status === "archived" ? "В архиве" : "Черновик"}</Text>
        <View style={s.actions}>
          {row.status !== "published" ? <Pressable onPress={() => void setStatus(row, "published")} style={s.smallPrimary}><Text style={s.primaryText}>Опубликовать</Text></Pressable> : <Pressable onPress={() => void setStatus(row, "draft")} style={ui.outline}><Text style={ui.outlineText}>Снять с витрины</Text></Pressable>}
          <Pressable onPress={() => void setStatus(row, "archived")} style={s.small}><Text style={s.smallText}>В архив</Text></Pressable>
        </View>
      </View>)}
      {!rows.length ? <Text style={ui.subtitle}>Кампаний пока нет. Черновик можно сохранить и опубликовать позже.</Text> : null}
    </>}
  </EditorScreen>;
}

const s = StyleSheet.create({
  multiline: { minHeight: 92, textAlignVertical: "top", paddingTop: 14 }, disabled: { opacity: .45 },
  horizons: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4, marginBottom: 5 },
  horizon: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, minHeight: 40, paddingHorizontal: 13, justifyContent: "center" }, horizonSelected: { backgroundColor: colors.navySoft, borderColor: colors.navy }, horizonText: { color: colors.muted, fontSize: 12, fontWeight: "800" }, horizonTextSelected: { color: colors.navyDark },
  ideaRow: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }, ideaCopy: { flex: 1, gap: 2 }, ideaMonth: { color: colors.navy, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: .8 }, ideaTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" }, ideaSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17 }, ideaButton: { minHeight: 40, borderRadius: 12, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line }, ideaButtonSelected: { backgroundColor: colors.navy, borderColor: colors.navy }, ideaButtonText: { color: colors.navyDark, fontSize: 12, fontWeight: "900" }, ideaButtonTextSelected: { color: "white" },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.3, color: colors.navy },
  status: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.navySoft, color: colors.navyDark, fontSize: 11, fontWeight: "900" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, smallPrimary: { minHeight: 46, borderRadius: 13, backgroundColor: colors.navy, paddingHorizontal: 15, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "white", fontWeight: "900" }, small: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, alignItems: "center", justifyContent: "center" }, smallText: { color: colors.muted, fontWeight: "800" },
});
