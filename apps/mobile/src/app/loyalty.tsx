import {useCallback, useEffect, useRef, useState} from "react";
import {ActivityIndicator, Alert, Pressable, StyleSheet, Switch, TextInput, View} from "react-native";
import { AppText as Text } from "@/components/app-text";
import {EditorScreen} from "@/components/editor-screen";
import {ui} from "@/components/app-shell";
import {useOwnerStore} from "@/lib/use-owner-store";
import {colors} from "@/lib/theme";
import {supabase} from "@/lib/supabase";

type Trigger = "orders" | "spend" | "referral";
type Reward = "percent" | "fixed" | "gift" | "cashback";
type Rule = {
  id: string; trigger: Trigger | "product"; threshold: number; category: string;
  reward: Reward; label: string; value: number; minOrder: number;
  expiryDays: number; repeat: boolean; earnOnReward: boolean; giftVariantId: string | null;
};
const makeId = () => `${Date.now().toString(16).padStart(8, "0").slice(-8)}-${Math.random().toString(16).slice(2, 6).padEnd(4, "0")}-4${Math.random().toString(16).slice(2, 5).padEnd(3, "0")}-a${Math.random().toString(16).slice(2, 5).padEnd(3, "0")}-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`;
const fresh = (): Rule => ({
  id: makeId(), trigger: "orders", threshold: 6, category: "", reward: "percent",
  label: "Скидка постоянному гостю", value: 10, minOrder: 0,
  expiryDays: 0, repeat: true, earnOnReward: false, giftVariantId: null,
});
const triggerLabels: Record<Trigger, string> = {
  orders: "За количество заказов", spend: "За сумму покупок", referral: "За приглашённых друзей",
};
const rewardLabels: Record<"percent" | "fixed", string> = {percent: "Скидка, %", fixed: "Скидка, ₸"};
const readError = "Не удалось загрузить действующие условия. Повторите загрузку перед изменением программы.";

export default function Loyalty() {
  const {store} = useOwnerStore();
  const [name, setName] = useState("Клуб гостей");
  const [enabled, setEnabled] = useState(false);
  const [terms, setTerms] = useState("");
  const [rules, setRules] = useState<Rule[]>([fresh()]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const originalRules = useRef(new Map<string, Rule>());

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadFailed(false);
    if (!store || !supabase) {
      setLoading(false);
      setLoadFailed(true);
      return;
    }
    try {
      const [programResult, rulesResult] = await Promise.all([
        supabase.from("loyalty_programs").select("name,enabled,terms").eq("tenant_id", store.id).maybeSingle(),
        supabase.from("loyalty_rules").select("config").eq("tenant_id", store.id).eq("active", true).order("created_at"),
      ]);
      if (id !== requestId.current) return;
      if (programResult.error || rulesResult.error || (programResult.data && !rulesResult.data?.length)) {
        setLoadFailed(true);
        return;
      }
      setName(programResult.data?.name ?? "Клуб гостей");
      setEnabled(programResult.data?.enabled ?? false);
      setTerms(programResult.data?.terms ?? "");
      const loadedRules = rulesResult.data?.length
        ? rulesResult.data.map(row => row.config as unknown as Rule)
        : [fresh()];
      originalRules.current = new Map(loadedRules.map(rule => [rule.id, rule]));
      setRules(loadedRules);
    } catch {
      if (id === requestId.current) setLoadFailed(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [store]);
  useEffect(() => {
    const sequence = requestId;
    void load();
    return () => { sequence.current++; };
  }, [load]);

  const patch = (index: number, value: Partial<Rule>) => setRules(current => current.map((rule, i) =>
    i === index ? {...rule, ...value} : rule));
  const save = async () => {
    if (!store || !supabase || loading || loadFailed || saving) return;
    if (name.trim().length < 2 || rules.some(rule => rule.threshold < 1 || rule.value < 1 || rule.label.trim().length < 2)) {
      return Alert.alert("Проверьте условия", "Название, порог и награда должны быть заполнены.");
    }
    if (rules.some(rule => (rule.reward === "percent" || rule.reward === "cashback") && rule.value > 100)) {
      return Alert.alert("Проверьте процент", "Скидка не может быть больше 100%.");
    }
    setSaving(true);
    try {
      const savedRules = rules.map(rule => {
        const original = originalRules.current.get(rule.id);
        return original && JSON.stringify(original) !== JSON.stringify(rule)
          ? {...rule, id: makeId()}
          : rule;
      });
      const program = {name: name.trim(), enabled, terms: terms.trim(), rules: savedRules};
      const {data, error} = await supabase.rpc(
        "save_loyalty_program" as never,
        {p_tenant_id: store.id, p_program: program} as never,
      );
      if (error || data !== true) {
        Alert.alert("Не удалось сохранить", "Проверьте условия и повторите.");
        return;
      }
      Alert.alert("Программа сохранена", "Новые условия действуют на сайте и в приложении. Накопленный прогресс гостей сохранён.");
      await load();
    } catch {
      Alert.alert("Не удалось сохранить", "Проверьте соединение и повторите.");
    } finally {
      setSaving(false);
    }
  };

  return <EditorScreen title="Лояльность" subtitle={store?.name}>
    {loading ? <ActivityIndicator color={colors.navy}/> : loadFailed ? <View style={ui.card}>
      <Text style={ui.cardTitle}>Условия не загружены</Text>
      <Text style={ui.subtitle}>{readError}</Text>
      <Pressable onPress={() => void load()} style={ui.outline}><Text style={ui.outlineText}>Повторить</Text></Pressable>
    </View> : store?.business_vertical !== "food" ? <View style={ui.card}>
      <Text style={ui.cardTitle}>Раздел для еды</Text>
      <Text style={ui.subtitle}>Программы подарков и приглашений сейчас доступны кафе, ресторанам, донерным, кондитерским и кофейням.</Text>
    </View> : <>
      <Text style={ui.title}>Клуб гостей</Text>
      <Text style={ui.subtitle}>Покупатель видит прогресс в «Моих заказах». Приглашение друга засчитывается после первого оплаченного заказа друга.</Text>
      <View style={s.toggle}><View style={{flex: 1}}>
        <Text style={ui.cardTitle}>Программа включена</Text>
        <Text style={ui.subtitle}>Начислять прогресс по новым оплаченным заказам</Text>
      </View><Switch value={enabled} onValueChange={setEnabled} trackColor={{false: "#D7DEE3", true: colors.navy}}/></View>
      <View style={ui.card}>
        <Text style={ui.label}>Название карты</Text>
        <TextInput style={ui.input} value={name} onChangeText={setName} maxLength={60}/>
        <Text style={ui.label}>Общие условия · необязательно</Text>
        <TextInput style={[ui.input, s.multiline]} value={terms} onChangeText={setTerms} multiline maxLength={1200} placeholder="Где и как действует программа"/>
      </View>
      {rules.map((rule, index) => <View key={rule.id} style={ui.card}>
        <View style={s.row}><Text style={ui.cardTitle}>Правило {index + 1}</Text>
          {rules.length > 1 ? <Pressable onPress={() => setRules(current => current.filter((_, i) => i !== index))}><Text style={s.remove}>Удалить</Text></Pressable> : null}
        </View>
        {(rule.trigger === "product" || rule.reward === "gift" || rule.reward === "cashback") ? <Text style={ui.subtitle}>
          Это правило создано на сайте. Его сложные условия сохранены; отредактируйте их в веб-кабинете.
        </Text> : <>
          <Text style={ui.label}>За что награждаем</Text>
          <View style={s.chips}>{(Object.keys(triggerLabels) as Trigger[]).map(value => <Pressable key={value} onPress={() => patch(index, {trigger: value})} style={[s.chip, rule.trigger === value && s.chipOn]}><Text style={[s.chipText, rule.trigger === value && s.chipTextOn]}>{triggerLabels[value]}</Text></Pressable>)}</View>
          <Text style={ui.label}>{rule.trigger === "spend" ? "Сумма покупок, ₸" : rule.trigger === "referral" ? "Количество друзей" : "Количество заказов"}</Text>
          <TextInput style={ui.input} value={String(rule.threshold)} onChangeText={value => patch(index, {threshold: Math.max(0, Number(value.replace(/\D/g, "")) || 0)})} keyboardType="number-pad"/>
          <Text style={ui.label}>Награда</Text>
          <View style={s.chips}>{(Object.keys(rewardLabels) as ("percent" | "fixed")[]).map(value => <Pressable key={value} onPress={() => patch(index, {reward: value})} style={[s.chip, rule.reward === value && s.chipOn]}><Text style={[s.chipText, rule.reward === value && s.chipTextOn]}>{rewardLabels[value]}</Text></Pressable>)}</View>
          <TextInput style={ui.input} value={rule.label} onChangeText={value => patch(index, {label: value})} maxLength={100} placeholder="Например: Скидка постоянному гостю"/>
          <TextInput style={ui.input} value={String(rule.value)} onChangeText={value => patch(index, {value: Math.max(0, Number(value.replace(/\D/g, "")) || 0)})} keyboardType="number-pad" placeholder={rule.reward === "percent" ? "Процент" : "Сумма в ₸"}/>
        </>}
      </View>)}
      {rules.length < 8 ? <Pressable onPress={() => setRules(current => [...current, fresh()])} style={ui.outline}><Text style={ui.outlineText}>+ Добавить правило</Text></Pressable> : null}
      <Pressable disabled={saving} onPress={() => void save()} style={ui.button}><Text style={ui.buttonText}>{saving ? "Сохраняем…" : "Сохранить программу"}</Text></Pressable>
    </>}
  </EditorScreen>;
}

const s = StyleSheet.create({
  toggle: {flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 17},
  multiline: {minHeight: 96, textAlignVertical: "top", paddingTop: 14},
  row: {flexDirection: "row", alignItems: "center", justifyContent: "space-between"},
  remove: {fontSize: 12, fontWeight: "900", color: colors.danger},
  chips: {flexDirection: "row", flexWrap: "wrap", gap: 7},
  chip: {borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 11, paddingVertical: 9},
  chipOn: {backgroundColor: colors.navy, borderColor: colors.navy},
  chipText: {fontSize: 11, fontWeight: "800", color: colors.muted},
  chipTextOn: {color: "white"},
});
