import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppText as Text } from "@/components/app-text";
import { EditorScreen } from "@/components/editor-screen";
import { ui } from "@/components/app-shell";
import { useOwnerStore } from "@/lib/use-owner-store";
import { supabase } from "@/lib/supabase";
import { merchantPreviewStore } from "@/lib/merchant-preview";
import { trialDisplay } from "@/lib/trial-clock";
import { DUKENIM_MERCHANT_THEME as theme } from "@/components/merchant-brand-theme";

const premiumFeatures = [
  "Фото Studio: пакеты из 4–5 вариантов с ручным одобрением",
  "Новые Stories и расширенные шаблоны публичной витрины",
  "История исходников, результатов и действий публикации",
  "Командные роли и расширенная аналитика",
] as const;
type TrialClockRow = { status:"active"|"paused"|"trial"; trial_ends_at:string|null; server_now:string };

export default function Plan() {
  const { uiPreview } = useLocalSearchParams<{ uiPreview?:string }>();
  const preview = uiPreview === "390";
  const { store } = useOwnerStore(preview ? merchantPreviewStore : undefined);
  const [clock, setClock] = useState<TrialClockRow|null>(preview ? { status:"trial", trial_ends_at:merchantPreviewStore.trial_ends_at ?? null, server_now:"2026-10-02T12:00:00.000Z" } : null);
  const [loading, setLoading] = useState(!preview);
  const [clockError, setClockError] = useState("");
  const [, setTick] = useState(0);
  const monotonicStart = useRef(0);

  useEffect(() => {
    if (preview || !store || !supabase) return;
    let mounted = true;
    setLoading(true); setClockError("");
    void supabase.rpc("get_trial_clock", { p_tenant_id:store.id }).then(result => {
      if (!mounted) return;
      const row = Array.isArray(result.data) ? result.data[0] as TrialClockRow|undefined : undefined;
      if (result.error || !row) { setClockError("Не удалось проверить срок на сервере."); setClock(null); }
      else { monotonicStart.current = performance.now(); setClock(row); }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [preview, store]);
  useEffect(() => { if (!clock) return; monotonicStart.current = performance.now(); const id = setInterval(() => setTick(value => value + 1), 30_000); return () => clearInterval(id); }, [clock]);

  const serverNow = clock ? Date.parse(clock.server_now) + (performance.now() - monotonicStart.current) : 0;
  const trial = clock ? trialDisplay(clock.status, clock.trial_ends_at, serverNow) : null;
  const selectedPlan = (clock?.status === "trial" ? store?.next_plan : store?.plan) ?? "basic";
  const premiumSelected = selectedPlan === "standard" || selectedPlan === "pro";
  return <EditorScreen title="Тариф" subtitle={store?.name}>
    <Text style={ui.title}>Прозрачный тариф без скрытой активации</Text>
    <Text style={ui.subtitle}>Пробный период считается на сервере. После его окончания оплата не включается автоматически.</Text>
    <View style={s.current}>
      <Text style={s.eyebrow}>{clock?.status === "active" ? "ТЕКУЩИЙ ДОСТУП" : "ПРОБНЫЙ ПЕРИОД"}</Text>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.clock}>{trial?.fullLabel ?? (clockError || "Срок недоступен")}</Text>}
      <Text style={s.period}>{clock?.status === "trial" ? "Выбранный план" : "Текущий план"}: {premiumSelected ? "Premium · 35 000 ₸" : "Base · 25 000 ₸"} в месяц. Оплата оформляется отдельно.</Text>
    </View>
    <View style={s.premium}>
      <View style={s.premiumHeader}><View style={{flex:1}}><Text style={s.premiumEyebrow}>AI-ФОТО И КРЕДИТЫ</Text><Text style={s.premiumTitle}>Premium</Text></View><View style={s.price}><Text style={s.priceValue}>35 000 ₸</Text><Text style={s.priceNote}>в месяц</Text></View></View>
      <Text style={s.premiumLead}>Base — 25 000 ₸ в месяц за каталог и заказы. Premium добавляет AI-фото с учётом кредитов и работу с контентом. Генерация фото пока не подключена.</Text>
      {premiumFeatures.map(item => <View key={item} style={s.feature}><Text style={s.check}>✓</Text><Text style={s.featureText}>{item}</Text></View>)}
      <View style={s.quota}><Text style={s.quotaTitle}>Квота AI-фото уточняется</Text><Text style={s.quotaCopy}>Баланс кредитов и списания после успешной генерации предусмотрены. Точное включённое количество объявим после проверки стоимости и запуска провайдера.</Text></View>
      <Pressable disabled accessibilityRole="button" style={s.disabledButton}><Text style={s.disabledText}>Оплата пока недоступна</Text></Pressable>
      <Text style={s.legal}>Paddle рассматривается только для web‑подписки Dukenim. Покупки физических товаров через него не проводятся; для iOS требуется отдельная проверка IAP.</Text>
    </View>
    <Pressable onPress={() => router.push("/support" as never)} style={[ui.button, { backgroundColor:theme.accent, borderRadius:theme.buttonRadius }]}><Text style={[ui.buttonText, { color:theme.accentInk }]}>Задать вопрос поддержке</Text></Pressable>
  </EditorScreen>;
}

const s = StyleSheet.create({
  current:{padding:22,gap:8,borderRadius:24,backgroundColor:theme.accentStrong},eyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1.3,color:"#E8DCE4"},clock:{fontSize:27,lineHeight:33,fontWeight:"900",color:"#FFFFFF",letterSpacing:-.5},period:{fontSize:12,lineHeight:18,color:"#E8DCE4"},premium:{padding:18,gap:12,borderRadius:24,borderWidth:1,borderColor:"#DED5DB",backgroundColor:"#FFFFFF"},premiumHeader:{flexDirection:"row",gap:12,alignItems:"flex-start"},premiumEyebrow:{fontSize:9,fontWeight:"900",letterSpacing:1,color:"#8B5A23"},premiumTitle:{fontSize:30,fontWeight:"900",letterSpacing:-.8,color:"#292329",marginTop:3},premiumLead:{fontSize:13,lineHeight:19,color:"#6B6268"},price:{alignItems:"flex-end"},priceValue:{fontSize:18,fontWeight:"900",color:theme.accentStrong},priceNote:{fontSize:9,color:"#766C73",marginTop:2},feature:{flexDirection:"row",alignItems:"flex-start",gap:9},check:{width:22,height:22,borderRadius:11,backgroundColor:"#F0E5EB",textAlign:"center",lineHeight:22,fontWeight:"900",color:theme.accentStrong},featureText:{flex:1,fontSize:12,lineHeight:18,fontWeight:"700",color:"#343035"},quota:{padding:13,borderRadius:16,backgroundColor:"#FFF4D8"},quotaTitle:{fontSize:12,fontWeight:"900",color:"#6A4A12"},quotaCopy:{fontSize:10,lineHeight:16,color:"#765A2C",marginTop:4},disabledButton:{minHeight:50,borderRadius:16,alignItems:"center",justifyContent:"center",backgroundColor:"#DED8DC"},disabledText:{fontSize:13,fontWeight:"900",color:"#81777E"},legal:{fontSize:9,lineHeight:15,color:"#7A7077"},
});
