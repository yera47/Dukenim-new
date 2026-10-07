import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOwnerStore } from "@/lib/use-owner-store";
import { site, colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useMerchantBrand } from "@/components/merchant-brand-theme";

export default function StoreLogo() {
  const params=useLocalSearchParams<{returnTo?:string}>();
  const{applyStore}=useMerchantBrand();
  const { store, loading } = useOwnerStore();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [palette, setPalette] = useState<string[]>([]);
  const [colorTheme, setColorTheme] = useState<{background:string;surface:string;accent:string}|null>(null);
  const [colorDraft,setColorDraft]=useState<{background:string;surface:string;accent:string}|null>(null);
  const [savedLogo,setSavedLogo]=useState<string|null>(null);
  useEffect(()=>setSavedLogo(store?.logo_url??null),[store?.logo_url]);
  const choose = async () => {
    if (!store || !supabase || busy) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if ((asset.fileSize ?? 0) > 3 * 1024 * 1024) { Alert.alert("Файл слишком большой", "Выберите PNG, JPEG или WebP до 3 МБ."); return; }
    setPreview(asset.uri);
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("tenantId", store.id);
      form.append("logo", { uri: asset.uri, name: asset.fileName ?? "logo.jpg", type: asset.mimeType ?? "image/jpeg" } as unknown as Blob);
      const response = await fetch(`${site}/api/mobile/logo`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token ?? ""}` }, body: form });
      const body = await response.json() as { logoUrl?: string; palette?:string[]; colorTheme?:{background:string;surface:string;accent:string}; error?: string };
      if (!response.ok || !body.logoUrl) throw new Error(body.error ?? "Логотип не сохранился.");
      setSavedLogo(body.logoUrl);
      setPalette(body.palette??[]);
      setColorTheme(body.colorTheme??null);
      setColorDraft(body.colorTheme??null);
      if(body.colorTheme)return;
      Alert.alert("Логотип обновлён", "Он уже используется на витрине сайта и в приложении.", [{ text: "Готово", onPress: () => router.back() }]);
    } catch (error) { Alert.alert("Не удалось обновить логотип", error instanceof Error ? error.message : "Повторите загрузку."); }
    finally { setBusy(false); }
  };
  const applyPalette=async()=>{
    if(!store||!supabase||!colorTheme||applying)return;
    setApplying(true);
    try{
      const current=await supabase.from("tenant_storefront_settings").select("tenant_id").eq("tenant_id",store.id).maybeSingle();
      if(current.error)throw current.error;
      const values={color_theme:colorTheme,brand_color:colorTheme.accent,palette_key:"mono",layout_config:{typography:"modern",hero:"editorial",density:"balanced",columns:4,corners:"rounded",imageRatio:"portrait"},updated_at:new Date().toISOString()};
      const saved=current.data
        ?await supabase.from("tenant_storefront_settings").update(values as never).eq("tenant_id",store.id).select("tenant_id").maybeSingle()
        :await supabase.from("tenant_storefront_settings").insert({tenant_id:store.id,template_key:"gallery",hero_title:null,hero_subtitle:null,hero_image_url:null,hero_cta_label:"Смотреть каталог",...values} as never).select("tenant_id").maybeSingle();
      if(saved.error||!saved.data)throw saved.error??new Error("Theme was not saved");
      const draftRow=await supabase.from("catalog_builder_drafts").select("revision,state").eq("tenant_id",store.id).maybeSingle();
      if(draftRow.error)throw draftRow.error;
      if(draftRow.data){
        const revision=Number(draftRow.data.revision);
        const state=(draftRow.data.state&&typeof draftRow.data.state==="object"?draftRow.data.state:{}) as Record<string,unknown>;
        const draftSaved=await supabase.from("catalog_builder_drafts").update({revision:revision+1,state:{...state,logoStep:"saved",colorTheme,suggestedColorTheme:colorTheme},updated_at:new Date().toISOString()} as never).eq("tenant_id",store.id).eq("revision",revision).select("revision").maybeSingle();
        if(draftSaved.error||!draftSaved.data)throw draftSaved.error??new Error("Brand draft was changed elsewhere");
      }
      applyStore({...store,brand_profile:{brand_color:colorTheme.accent,color_theme:colorTheme,layout_config:values.layout_config}});
      if(params.returnTo==="builder"){router.replace("/catalog-builder" as never);return;}
      Alert.alert("Цвета применены","Откройте предпросмотр и проверьте текст, фотографии и кнопки.",[{text:"К предпросмотру",onPress:()=>router.replace("/preview" as never)}]);
    }catch{Alert.alert("Цвета не применены","Логотип сохранён, но оформление осталось прежним. Повторите после проверки соединения.");}
    finally{setApplying(false);}
  };
  const removeLogo=async()=>{
    if(!store||!supabase||busy||!savedLogo)return;
    setBusy(true);
    try{
      const{data:{session}}=await supabase.auth.getSession();
      const response=await fetch(`${site}/api/mobile/logo?tenantId=${encodeURIComponent(store.id)}`,{method:"DELETE",headers:{Authorization:`Bearer ${session?.access_token??""}`}});
      const body=await response.json() as {error?:string};
      if(!response.ok)throw new Error(body.error??"Логотип не удалён.");
      setSavedLogo(null);setPreview(null);setPalette([]);setColorTheme(null);setColorDraft(null);
      Alert.alert("Логотип удалён","Витрина сразу вернулась к текстовому названию магазина.");
    }catch(error){Alert.alert("Не удалось удалить логотип",error instanceof Error?error.message:"Проверьте подключение.");}
    finally{setBusy(false);}
  };
  if(colorTheme&&colorDraft)return <SafeAreaView style={s.page}><View style={s.header}><Pressable accessibilityLabel="Назад" onPress={()=>router.back()} style={s.back}><Text style={s.arrow}>‹</Text></Pressable><Text style={s.heading}>Профиль бренда</Text></View><Text style={s.title}>Цвета из логотипа</Text><Text style={s.copy}>Логотип уже сохранён. Исправьте любой HEX-цвет до применения. Вместе сохранятся светлые поверхности, кнопки, типографика и скругления для buyer и merchant preview.</Text><View style={s.preview}>{(preview||savedLogo)?<Image alt="Сохранённый логотип" source={{uri:preview||savedLogo!}} contentFit="contain" style={s.image}/>:null}</View><View style={s.colorFields}>{([['background','Фон'],['surface','Карточки'],['accent','Кнопки']] as const).map(([key,label])=><View key={key} style={s.colorField}><Text style={s.colorLabel}>{label}</Text><View style={[s.colorDot,{backgroundColor:colorTheme[key]}]}/><TextInput autoCapitalize="characters" maxLength={7} value={colorDraft[key]} onChangeText={value=>{setColorDraft(current=>current?{...current,[key]:value}:current);if(/^#[0-9a-f]{6}$/i.test(value))setColorTheme(current=>current?{...current,[key]:value}:current);}} style={s.colorInput}/></View>)}</View><View style={s.swatches}>{palette.slice(0,5).map((color,index)=><View key={`${color}-${index}`} style={[s.swatch,{backgroundColor:color}]}/>)}</View><Pressable disabled={applying||Object.values(colorDraft).some(value=>!/^#[0-9a-f]{6}$/i.test(value))} onPress={()=>void applyPalette()} style={[s.button,(applying||Object.values(colorDraft).some(value=>!/^#[0-9a-f]{6}$/i.test(value)))&&{opacity:.5}]}>{applying?<ActivityIndicator color="white"/>:<Text style={s.buttonText}>Сохранить профиль и открыть preview</Text>}</Pressable><Pressable onPress={()=>router.back()} style={s.keep}><Text style={s.keepText}>Оставить текущее оформление</Text></Pressable><Text style={s.note}>Для белого знака используется нейтральный графитовый акцент; многоцветный знак берёт наиболее выразительный безопасный цвет.</Text></SafeAreaView>;
  return <SafeAreaView style={s.page}><View style={s.header}><Pressable accessibilityLabel="Назад" onPress={() => router.back()} style={s.back}><Text style={s.arrow}>‹</Text></Pressable><Text style={s.heading}>Логотип магазина</Text></View><Text style={s.title}>Ваш знак на витрине</Text><Text style={s.copy}>После выбора логотип сразу появляется в preview. Затем вы подтверждаете или исправляете предложенные цвета — без платного AI и без перерисовки знака.</Text><View style={s.preview}>{(preview||savedLogo) ? <Image alt="Логотип магазина" source={{ uri: preview||savedLogo! }} contentFit="contain" style={s.image} /> : <Text style={s.placeholder}>Логотип пока не выбран</Text>}</View><Pressable disabled={busy || loading || !store} onPress={() => void choose()} style={[s.button, (busy || loading || !store) && { opacity: .5 }]}>{busy ? <ActivityIndicator color="white" /> : <Text style={s.buttonText}>{savedLogo?"Заменить логотип":"Выбрать и сохранить логотип"}</Text>}</Pressable>{savedLogo?<Pressable disabled={busy} onPress={()=>void removeLogo()} style={s.delete}><Text style={s.deleteText}>Удалить логотип</Text></Pressable>:null}<Text style={s.note}>PNG, JPEG или WebP до 3 МБ. Замена и удаление сохраняются только для выбранного магазина.</Text></SafeAreaView>;
}

const s = StyleSheet.create({ page: { flex: 1, backgroundColor: "white", padding: 22, gap: 16 }, header: { flexDirection: "row", alignItems: "center", gap: 15 }, back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.navySoft, alignItems: "center", justifyContent: "center" }, arrow: { fontSize: 31, lineHeight: 34, color: colors.navyDark }, heading: { fontSize: 15, fontWeight: "900", color: colors.ink }, title: { fontSize: 31, fontWeight: "900", color: colors.ink }, copy: { fontSize: 14, lineHeight: 21, color: colors.muted }, preview: { height: 170, borderRadius: 22, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F9FA" }, image: { width: "80%", height: "80%" }, placeholder: { color: colors.muted, fontWeight: "700" }, button: { minHeight: 54, backgroundColor: colors.navy, borderRadius: 15, alignItems: "center", justifyContent: "center" }, buttonText: { color: "white", fontWeight: "900", fontSize: 15 }, note: { color: colors.muted, fontSize: 12, lineHeight: 18 }, colorFields:{gap:8},colorField:{minHeight:52,flexDirection:"row",alignItems:"center",gap:10,borderWidth:1,borderColor:colors.line,borderRadius:14,paddingHorizontal:12},colorLabel:{width:68,fontSize:12,fontWeight:"900",color:colors.ink},colorDot:{width:25,height:25,borderRadius:8,borderWidth:1,borderColor:"#00000018"},colorInput:{flex:1,minWidth:0,fontSize:15,fontWeight:"800",color:colors.ink},swatches:{flexDirection:"row",gap:8},swatch:{flex:1,height:36,borderRadius:11,borderWidth:1,borderColor:"#00000014"},keep:{minHeight:44,alignItems:"center",justifyContent:"center"},keepText:{fontSize:13,fontWeight:"900",color:colors.navyDark},delete:{minHeight:48,borderRadius:14,borderWidth:1,borderColor:"#E5BBB7",alignItems:"center",justifyContent:"center"},deleteText:{fontSize:14,fontWeight:"900",color:colors.danger} });
