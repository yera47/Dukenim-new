import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { EditorScreen } from "@/components/editor-screen";
import { ui } from "@/components/app-shell";
import { useOwnerStore } from "@/lib/use-owner-store";
import { colors, site } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Campaign = { id: string; title: string; eyebrow: string | null; body: string | null; cta_label: string; status: "draft" | "published" | "archived"; image_url: string | null };
type AiDraft = { eyebrow?: string; title: string; body: string; ctaLabel: string };

export default function Campaigns() {
  const { store } = useOwnerStore();
  const params = useLocalSearchParams<{ brief?: string }>();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiBrief, setAiBrief] = useState("");
  const [proposal, setProposal] = useState<AiDraft | null>(null);
  const [title, setTitle] = useState("");
  const [eyebrow, setEyebrow] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Смотреть");

  useEffect(() => { if (typeof params.brief === "string") setAiBrief(params.brief.slice(0, 800)); }, [params.brief]);
  const load = useCallback(async () => {
    if (!store || !supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from("storefront_campaigns")
      .select("id,title,eyebrow,body,cta_label,status,image_url")
      .eq("tenant_id", store.id).order("created_at", { ascending: false });
    setLoading(false);
    if (error) Alert.alert("Не удалось загрузить акции");
    else setRows((data ?? []) as Campaign[]);
  }, [store]);
  useEffect(() => { void load(); }, [load]);

  const propose = async () => {
    if (!store || !supabase || aiBrief.trim().length < 8 || aiBusy) return;
    setAiBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${site}/api/mobile/ai-promotion`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ tenantId: store.id, brief: aiBrief.trim() }),
      });
      const result = await response.json() as { draft?: AiDraft; error?: string };
      if (!response.ok || !result.draft) throw new Error(result.error ?? "Не удалось подготовить текст.");
      setProposal(result.draft);
    } catch (error) {
      Alert.alert("AI Studio", error instanceof Error ? error.message : "Не удалось подготовить текст.");
    } finally { setAiBusy(false); }
  };
  const useProposal = () => {
    if (!proposal) return;
    setTitle(proposal.title);
    setEyebrow(proposal.eyebrow ?? "");
    setBody(proposal.body);
    setCtaLabel(proposal.ctaLabel);
    setProposal(null);
  };
  const create = async () => {
    if (!store || !supabase || title.trim().length < 2) return Alert.alert("Добавьте заголовок", "Минимум два символа.");
    setSaving(true);
    const { error } = await supabase.from("storefront_campaigns").insert({
      tenant_id: store.id, title: title.trim(), eyebrow: eyebrow.trim() || null,
      body: body.trim() || null, cta_label: ctaLabel.trim() || "Смотреть", cta_href: "#catalog", status: "draft",
    });
    setSaving(false);
    if (error) Alert.alert("Акция не сохранена", "Проверьте тариф и данные.");
    else { setTitle(""); setEyebrow(""); setBody(""); setCtaLabel("Смотреть"); await load(); }
  };
  const setStatus = async (row: Campaign, status: Campaign["status"]) => {
    if (!supabase || !store) return;
    const { error } = await supabase.from("storefront_campaigns")
      .update({ status, updated_at: new Date().toISOString() }).eq("tenant_id", store.id).eq("id", row.id);
    if (error) Alert.alert("Статус не изменён"); else await load();
  };

  return <EditorScreen title="Акции" subtitle={store?.name}>
    <Text style={ui.title}>Кампании</Text>
    <Text style={ui.subtitle}>AI подготовит текст по вашим реальным условиям. Вы проверяете его, сохраняете черновик и отдельно публикуете.</Text>
    <View style={ui.card}>
      <Text style={ui.cardTitle}>Идея акции с AI</Text>
      <Text style={ui.subtitle}>Укажите товары и условия. AI не должен придумывать скидку, срок или наличие.</Text>
      <TextInput style={[ui.input, s.multiline]} value={aiBrief} onChangeText={setAiBrief} multiline maxLength={800} placeholder="Например: акция на выпечку по пятницам; скидка 10% до конца месяца" />
      <Pressable accessibilityRole="button" disabled={aiBusy || aiBrief.trim().length < 8} onPress={() => void propose()} style={[ui.button, (aiBusy || aiBrief.trim().length < 8) && s.disabled]}>
        <Text style={ui.buttonText}>{aiBusy ? "Подготовка…" : "Предложить текст"}</Text>
      </Pressable>
    </View>
    {proposal ? <View style={ui.card}>
      <Text style={s.eyebrow}>ПРЕДЛОЖЕНИЕ AI · НЕ СОХРАНЕНО</Text>
      <Text style={ui.cardTitle}>{proposal.title}</Text>
      <Text style={ui.subtitle}>{proposal.body}</Text>
      <Text style={ui.subtitle}>Кнопка: {proposal.ctaLabel}</Text>
      <Pressable accessibilityRole="button" onPress={useProposal} style={ui.button}><Text style={ui.buttonText}>Вставить в черновик</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setProposal(null)} style={ui.outline}><Text style={ui.outlineText}>Отклонить</Text></Pressable>
    </View> : null}
    <View style={ui.card}>
      <Text style={ui.cardTitle}>Новая акция</Text>
      <TextInput style={ui.input} value={title} onChangeText={setTitle} maxLength={90} placeholder="Название акции" />
      <TextInput style={ui.input} value={eyebrow} onChangeText={setEyebrow} maxLength={40} placeholder="Надзаголовок · необязательно" />
      <TextInput style={[ui.input, s.multiline]} value={body} onChangeText={setBody} multiline maxLength={280} placeholder="Коротко объясните предложение" />
      <TextInput style={ui.input} value={ctaLabel} onChangeText={setCtaLabel} maxLength={36} placeholder="Текст кнопки" />
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void create()} style={ui.button}><Text style={ui.buttonText}>{saving ? "Сохраняем…" : "Сохранить черновик"}</Text></Pressable>
    </View>
    {loading ? <ActivityIndicator color={colors.navy} /> : rows.map(row => <View key={row.id} style={ui.card}>
      <Text style={s.eyebrow}>{row.eyebrow || "АКЦИЯ"}</Text>
      <Text style={ui.cardTitle}>{row.title}</Text>
      {row.body ? <Text style={ui.subtitle}>{row.body}</Text> : null}
      <Text style={s.status}>{row.status === "published" ? "Опубликована" : row.status === "archived" ? "В архиве" : "Черновик"}</Text>
      <View style={s.actions}>
        {row.status !== "published" ? <Pressable onPress={() => void setStatus(row, "published")} style={s.smallPrimary}><Text style={s.primaryText}>Опубликовать</Text></Pressable> : <Pressable onPress={() => void setStatus(row, "draft")} style={ui.outline}><Text style={ui.outlineText}>Снять с витрины</Text></Pressable>}
        <Pressable onPress={() => void setStatus(row, "archived")} style={s.small}><Text style={s.smallText}>В архив</Text></Pressable>
      </View>
    </View>)}
    {!loading && !rows.length ? <Text style={ui.subtitle}>Акций пока нет.</Text> : null}
  </EditorScreen>;
}

const s = StyleSheet.create({
  multiline: { minHeight: 92, textAlignVertical: "top", paddingTop: 14 },
  disabled: { opacity: .45 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.3, color: colors.navy },
  status: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.navySoft, color: colors.navyDark, fontSize: 11, fontWeight: "900" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallPrimary: { minHeight: 46, borderRadius: 13, backgroundColor: colors.navy, paddingHorizontal: 15, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "white", fontWeight: "900" },
  small: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, alignItems: "center", justifyContent: "center" },
  smallText: { color: colors.muted, fontWeight: "800" },
});
