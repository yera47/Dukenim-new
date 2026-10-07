import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { AppText as Text } from "@/components/app-text";
import { EditorScreen } from "@/components/editor-screen";
import { AppSymbol } from "@/components/app-symbol";
import { ui } from "@/components/app-shell";
import { DUKENIM_MERCHANT_THEME as theme } from "@/components/merchant-brand-theme";
import { merchantPreviewImages, merchantPreviewStore } from "@/lib/merchant-preview";
import { useOwnerStore } from "@/lib/use-owner-store";

type Mode = "background" | "angles";
type Scenario = "product" | "hero" | "promo";
type Stage = "setup" | "queue" | "review" | "error";

const steps = ["Настройка", "Очередь", "Проверка"] as const;
const previewVariantNames = ["Светлый фон", "Тёплый фон", "Крупный план", "Воздух", "Мягкая тень"] as const;

export default function PhotoStudio() {
  const { uiPreview, stage: stageParam } = useLocalSearchParams<{ uiPreview?: string; stage?: string }>();
  const preview = Platform.OS === "web" && uiPreview === "390";
  const { store } = useOwnerStore(preview ? merchantPreviewStore : undefined);
  const [source, setSource] = useState<string | null>(preview ? merchantPreviewImages[0] : null);
  const [scenario, setScenario] = useState<Scenario>("product");
  const [mode, setMode] = useState<Mode>("background");
  const [instruction, setInstruction] = useState("Светлый студийный фон, мягкая естественная тень");
  const [count, setCount] = useState<2 | 3 | 4 | 5>(3);
  const [stage, setStage] = useState<Stage>(stageParam === "review" && preview ? "review" : "setup");
  const [selected, setSelected] = useState(0);
  const [approved, setApproved] = useState<number[]>([]);
  const variants = useMemo(() => Array.from({ length: count }, (_, index) => ({
    id: index,
    uri: preview ? merchantPreviewImages[(index + 1) % merchantPreviewImages.length] : source,
    label: preview ? previewVariantNames[index] : `Вариант ${index + 1}`,
  })), [count, preview, source]);

  async function pickSource() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Нужен доступ к фото", "Разрешите выбрать исходное фото товара.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 1 });
    if (!result.canceled) {
      setSource(result.assets[0].uri);
      setStage("setup");
      setApproved([]);
    }
  }

  function requestPack() {
    if (!source || instruction.trim().length < 8) {
      setStage("error");
      return;
    }
    setStage("error");
  }

  const activeStep = stage === "setup" || stage === "error" ? 0 : stage === "queue" ? 1 : 2;
  const selectedVariant = variants[selected];

  return (
    <EditorScreen title="Фото Studio" subtitle={store?.name}>
      <View style={s.hero}>
        <View style={s.heroIcon}><AppSymbol name="sparkles" color="#FFFFFF" size={24} /></View>
        <View style={s.flex}>
          <Text style={s.eyebrow}>DUKENIM PREMIUM · ПРЕДПРОСМОТР</Text>
          <Text style={s.title}>Один товар — 2–5 готовых подач</Text>
          <Text style={s.lead}>Товар остаётся неизменным слоем. Меняются только фон и тень; публикация — после вашей проверки.</Text>
        </View>
      </View>

      <View accessibilityLabel="Этапы обработки" style={s.steps}>
        {steps.map((label, index) => <View key={label} style={[s.step, index <= activeStep && s.stepActive]}><Text style={[s.stepText, index <= activeStep && s.stepTextActive]}>{index + 1}. {label}</Text></View>)}
      </View>

      <View style={ui.card}>
        <Text style={ui.label}>Что подготовить</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scenarios}>
          {([
            ["product", "Фото товара", "Постановочные кадры"],
            ["hero", "Обложка каталога", "Hero + отдельный текст"],
            ["promo", "Stories / промо", "Вертикальный draft"],
          ] as const).map(([value, title, copy]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{selected:scenario===value}} onPress={()=>setScenario(value)} style={[s.scenario,s.scenarioCompact,scenario===value&&s.scenarioSelected]}><Text style={[s.scenarioTitle,s.scenarioTitleCompact]}>{title}</Text><Text style={[s.scenarioCopy,s.scenarioCopyCompact]}>{copy}</Text></Pressable>)}
        </ScrollView>
        <Text style={ui.label}>Режим</Text>
        <View style={s.modeRow}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "background" }} onPress={() => setMode("background")} style={[s.mode, mode === "background" && s.modeSelected]}>
            <Text style={s.modeTitle}>Безопасный фон</Text><Text style={s.modeCopy}>Исходный товар не перерисовывается.</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "angles" }} onPress={() => setMode("angles")} style={[s.mode, mode === "angles" && s.modeSelected]}>
            <Text style={s.modeTitle}>Новые ракурсы</Text><Text style={s.modeCopy}>Нужны минимум 2 реальных референса и ручная QA.</Text>
          </Pressable>
        </View>
        {mode === "angles" ? <View style={s.warning}><Text style={s.warningTitle}>Генеративный режим</Text><Text style={s.warningCopy}>Детали одежды и товара могут измениться. Без дополнительных фото запрос не отправится.</Text></View> : null}

        <Pressable accessibilityRole="button" onPress={() => void pickSource()} style={s.upload}>
          {source ? <Image alt="Исходное фото товара" source={{ uri: source }} contentFit="cover" style={s.uploadImage} accessibilityLabel="Исходное фото товара" /> : <View style={s.uploadEmpty}><AppSymbol name="sparkles" color={theme.accentStrong} /><Text style={s.uploadTitle}>Выбрать исходное фото</Text><Text style={s.uploadCopy}>JPG или PNG, один товар в кадре</Text></View>}
          {source ? <View style={s.replace}><Text style={s.replaceText}>Заменить</Text></View> : null}
        </Pressable>

        <Text style={ui.label}>Как оформить подачу</Text>
        <TextInput accessibilityLabel="Описание оформления" multiline maxLength={500} value={instruction} onChangeText={setInstruction} style={[ui.input, s.textarea]} placeholder="Например: светлый фон, мягкая тень" />
        {scenario!=="product"?<View style={s.warning}><Text style={s.warningTitle}>Текст — отдельный draft</Text><Text style={s.warningCopy}>Цена, акция, состав и наличие берутся только из данных продавца. Перед применением обложка или Story откроется в точном storefront preview.</Text></View>:null}
        <View style={s.countRow}>
          <Text style={ui.label}>Вариантов в пакете</Text>
          {([2, 3, 4, 5] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: count === value }} onPress={() => setCount(value)} style={[s.count, count === value && s.countSelected]}><Text style={[s.countText, count === value && s.countTextSelected]}>{value}</Text></Pressable>)}
        </View>
        <View style={s.notice} accessibilityLiveRegion="polite">
          <Text style={s.noticeTitle}>{preview ? `Демо-баланс: 90 · резерв: ${count} · останется: ${90-count}` : "Баланс кредитов пока недоступен"}</Text>
          <Text style={s.noticeCopy}>{preview ? "Synthetic preview: 1 кредит = 1 успешно сохранённый 1 MP результат." : "Live-тариф провайдера и StoreKit-продукты не подтверждены, поэтому покупка и списание выключены."}</Text>
        </View>

        {stage === "queue" ? <View accessibilityLiveRegion="polite" style={s.notice}><Text style={s.noticeTitle}>Пакет в очереди</Text><Text style={s.noticeCopy}>Подготавливаем отдельные фон и тень. Искусственных задержек в реальном потоке не будет.</Text></View> : null}
        {stage === "error" ? <View accessibilityLiveRegion="polite" style={[s.notice, s.error]}><Text style={s.errorTitle}>Генерация пока недоступна</Text><Text style={s.noticeCopy}>Провайдер и лимит расходов не подключены. Фото не отправлено и квота не списана.</Text><Pressable onPress={() => setStage("setup")}><Text style={s.retry}>Вернуться к настройкам</Text></Pressable></View> : null}

        <Pressable accessibilityRole="button" onPress={requestPack} disabled={mode === "angles"} style={[ui.button, s.generate, mode === "angles" && s.disabled]}>
          <Text style={ui.buttonText}>{stage === "queue" ? "Проверяем доступность…" : `Создать ${count} вариантов`}</Text>
        </Pressable>
        <Text style={s.footnote}>Списываются только сохранённые, доступные и технически валидные результаты. Частичный сбой возвращает резерв; ограниченный технический повтор не создаёт повторного пользовательского списания.</Text>
        <Text style={s.footnote}>Покупка цифровых кредитов в iOS выключена до подтверждённых StoreKit IAP-продуктов. Купленный IAP-баланс не должен сгорать и хранится отдельно от периодического allowance.</Text>
      </View>

      {stage === "review" && source ? <View style={ui.card}>
        <View style={s.reviewHeader}><View style={s.flex}><Text style={ui.cardTitle}>Сравнение перед публикацией</Text><Text style={ui.subtitle}>Демо-интерфейс на синтетическом товаре; это не результат AI.</Text></View><View style={s.demoBadge}><Text style={s.demoBadgeText}>DEMO</Text></View></View>
        <View style={s.compare}>
          <View style={s.figure}><Image alt="Оригинал товара" source={{ uri: source }} contentFit="cover" style={s.compareImage} /><Text style={s.caption}>Оригинал</Text></View>
          <View style={s.figure}><Image alt={`Макет ${selected + 1}`} source={{ uri: selectedVariant?.uri ?? source }} contentFit="cover" style={s.compareImage} /><Text style={s.caption}>{selectedVariant?.label ?? `Макет ${selected + 1}`}</Text></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbs}>
          {variants.map(variant => <Pressable key={variant.id} accessibilityRole="button" accessibilityState={{ selected: selected === variant.id }} onPress={() => setSelected(variant.id)} style={[s.thumb, selected === variant.id && s.thumbSelected]}><Image alt={`Миниатюра варианта ${variant.id + 1}`} source={{ uri: variant.uri ?? source }} contentFit="cover" style={s.thumbImage} /><Text numberOfLines={2} style={[s.thumbText,s.thumbTextTaller]}>{approved.includes(variant.id) ? "✓ Одобрен" : variant.label}</Text></Pressable>)}
        </ScrollView>
        <View style={s.actionRow}>
          <Pressable onPress={() => setApproved(current => current.includes(selected) ? current : [...current, selected])} style={[ui.button, s.approve]}><Text style={ui.buttonText}>Одобрить вариант</Text></Pressable>
          <Pressable disabled style={[ui.button, s.publishDisabled]}><Text style={s.publishText}>Опубликовать ({approved.length})</Text></Pressable>
        </View>
        <Text style={s.footnote}>Автопубликации нет. Кнопка станет доступна только после серверного сохранения одобренных результатов.</Text>
      </View> : null}
    </EditorScreen>
  );
}

const s = StyleSheet.create({
  flex:{flex:1},hero:{borderRadius:24,backgroundColor:theme.accentStrong,padding:18,flexDirection:"row",gap:13},heroIcon:{width:46,height:46,borderRadius:15,backgroundColor:"#FFFFFF18",alignItems:"center",justifyContent:"center"},eyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1.1,color:"#E9DCE5"},title:{fontSize:25,lineHeight:29,fontWeight:"900",letterSpacing:-.5,color:"#FFFFFF",marginTop:5},lead:{fontSize:12,lineHeight:18,color:"#E9DCE5",marginTop:7},steps:{flexDirection:"row",gap:6},step:{flex:1,borderRadius:99,backgroundColor:"#E7E2E5",paddingVertical:8,paddingHorizontal:4},stepActive:{backgroundColor:theme.accent},stepText:{fontSize:9,fontWeight:"900",textAlign:"center",color:"#786E74"},stepTextActive:{color:"#FFFFFF"},scenarios:{gap:8},scenario:{width:138,minHeight:70,borderWidth:1,borderColor:"#DDD5DA",borderRadius:15,padding:11},scenarioSelected:{borderColor:theme.accent,backgroundColor:"#F8F1F5"},scenarioTitle:{fontSize:12,fontWeight:"900",color:"#292329"},scenarioCopy:{fontSize:9,lineHeight:14,color:"#756B72",marginTop:4},modeRow:{flexDirection:"row",gap:8},mode:{flex:1,minHeight:100,borderWidth:1,borderColor:"#DDD5DA",borderRadius:16,padding:13},modeSelected:{borderColor:theme.accent,backgroundColor:"#F8F1F5"},modeTitle:{fontSize:13,fontWeight:"900",color:"#292329"},modeCopy:{fontSize:10,lineHeight:15,color:"#756B72",marginTop:5},warning:{borderRadius:15,backgroundColor:"#FFF4D8",padding:12},warningTitle:{fontSize:12,fontWeight:"900",color:"#6A4A12"},warningCopy:{fontSize:10,lineHeight:16,color:"#765A2C",marginTop:3},upload:{minHeight:170,borderWidth:1,borderStyle:"dashed",borderColor:"#B99EAF",borderRadius:18,overflow:"hidden",backgroundColor:"#FAF7F9"},uploadImage:{width:"100%",height:220},uploadEmpty:{minHeight:170,alignItems:"center",justifyContent:"center",gap:7},uploadTitle:{fontSize:14,fontWeight:"900",color:theme.accentStrong},uploadCopy:{fontSize:10,color:"#756B72"},replace:{position:"absolute",right:10,bottom:10,borderRadius:99,backgroundColor:"#FFFFFFE8",paddingHorizontal:12,paddingVertical:7},replaceText:{fontSize:10,fontWeight:"900",color:theme.accentStrong},textarea:{minHeight:92,textAlignVertical:"top"},countRow:{flexDirection:"row",alignItems:"center",gap:8},count:{width:42,height:34,borderWidth:1,borderColor:"#D8D0D5",borderRadius:99,alignItems:"center",justifyContent:"center"},countSelected:{backgroundColor:theme.accent,borderColor:theme.accent},countText:{fontWeight:"900",color:theme.accentStrong},countTextSelected:{color:"#FFFFFF"},notice:{borderRadius:15,backgroundColor:"#F1EBEF",padding:13},error:{backgroundColor:"#FFF0EF",borderWidth:1,borderColor:"#E6B5B2"},noticeTitle:{fontSize:13,fontWeight:"900",color:theme.accentStrong},errorTitle:{fontSize:13,fontWeight:"900",color:"#8E2D2B"},noticeCopy:{fontSize:10,lineHeight:16,color:"#6D6269",marginTop:3},retry:{fontSize:11,fontWeight:"900",color:"#8E2D2B",marginTop:8,textDecorationLine:"underline"},generate:{backgroundColor:theme.accentStrong},disabled:{backgroundColor:"#B9B1B6"},footnote:{fontSize:10,lineHeight:16,color:"#756B72"},reviewHeader:{flexDirection:"row",alignItems:"flex-start",gap:8},demoBadge:{borderRadius:99,backgroundColor:"#FFF4D8",paddingHorizontal:9,paddingVertical:5},demoBadgeText:{fontSize:9,fontWeight:"900",color:"#6A4A12"},compare:{flexDirection:"row",gap:8},figure:{flex:1,borderWidth:1,borderColor:"#E0D8DD",borderRadius:16,overflow:"hidden"},compareImage:{width:"100%",aspectRatio:.8},caption:{fontSize:10,fontWeight:"900",color:"#6D6269",padding:9},thumbs:{gap:7},thumb:{width:92,borderWidth:2,borderColor:"transparent",borderRadius:13,overflow:"hidden",backgroundColor:"#F5F1F3"},thumbSelected:{borderColor:theme.accent},thumbImage:{width:"100%",height:72},thumbText:{fontSize:9,fontWeight:"800",color:"#62575E",padding:7},actionRow:{flexDirection:"row",gap:8},approve:{flex:1,backgroundColor:theme.accentStrong},publishDisabled:{flex:1,backgroundColor:"#E1DADE"},publishText:{fontSize:12,fontWeight:"900",color:"#81767D"},
  scenarioCompact:{width:98,minHeight:78,padding:8},
  scenarioTitleCompact:{fontSize:10.5},
  scenarioCopyCompact:{lineHeight:13},
  thumbTextTaller:{minHeight:34,lineHeight:11,padding:6},
});
