import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";
import { loadOwnerContext, routeForStore, type OwnerStore } from "@/lib/owner";
import { supabase } from "@/lib/supabase";
import { changeStoreArchive } from "@/lib/store-archive";
import { storeArchiveEnabled } from "@/lib/store-archive-feature";

const options = [
  { key: "food", label: "Еда и напитки", hint: "Ресторан, кофе, выпечка" },
  { key: "fashion", label: "Одежда", hint: "Бутик, обувь, аксессуары" },
  { key: "beauty", label: "Красота", hint: "Косметика и уход" },
  { key: "flowers", label: "Цветы", hint: "Букеты и декор" },
  { key: "home", label: "Дом", hint: "Мебель и товары для дома" },
  { key: "other", label: "Другое", hint: "Универсальный каталог" },
] as const;

export default function SetupStore() {
  const [name, setName] = useState(localStorage.getItem("dukenim_pending_business") ?? "");
  const [vertical, setVertical] = useState<(typeof options)[number]["key"] | null>(null);
  const [pending, setPending] = useState(false);
  const [archived, setArchived] = useState<OwnerStore[]>([]);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  useEffect(() => { void loadOwnerContext().then(context => {
    if (context.stores.length) { router.replace(routeForStore(context.stores[0]) as never); return; }
    setArchived(storeArchiveEnabled ? context.archivedStores ?? [] : []);
  }).catch(() => router.replace("/")); }, []);

  const restore = async (store: OwnerStore) => {
    setRestoreId(store.id);
    try {
      await changeStoreArchive({ action: "restore", tenantId: store.id, slug: store.slug, reason: "Восстановление владельцем" });
      localStorage.setItem("dukenim_selected_store", store.id);
      router.replace(routeForStore(store) as never);
    } catch (cause) { Alert.alert("Не удалось восстановить", cause instanceof Error ? cause.message : "Попробуйте ещё раз."); }
    finally { setRestoreId(null); }
  };

  const create = async () => {
    if (!supabase || name.trim().length < 2) { Alert.alert("Введите название магазина"); return; }
    if (!vertical) { Alert.alert("Выберите направление", "Dukenim использует его для первого шаблона."); return; }
    setPending(true);
    const { data, error } = await supabase.rpc("create_mobile_owner_store" as never, { p_name: name.trim(), p_vertical: vertical, p_format: "catalog" } as never);
    setPending(false);
    if (error) { Alert.alert("Не удалось создать магазин", error.message.includes("Confirm") ? "Сначала подтвердите email." : "Проверьте интернет и попробуйте снова."); return; }
    if (typeof data === "string") localStorage.setItem("dukenim_selected_store", data);
    localStorage.removeItem("dukenim_pending_business");
    router.replace("/onboarding" as never);
  };

  return <SafeAreaView style={s.page}><ScrollView contentContainerStyle={s.content}>
    <Pressable accessibilityLabel="Назад" onPress={() => router.back()} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
    <Text style={s.kicker}>Рабочее пространство</Text><Text style={s.title}>Создайте или восстановите магазин</Text><Text style={s.copy}>Аккаунт остаётся тем же. Новый магазин начнёт отдельную настройку, архивный вернётся с сохранёнными данными.</Text>
    {archived.length ? <View style={s.archiveBlock}><Text style={s.archiveHeading}>Архив</Text>{archived.map(store => <View key={store.id} style={s.archiveRow}><View style={{ flex: 1 }}><Text style={s.optionTitle}>{store.name}</Text><Text style={s.optionHint}>dukenim.kz/s/{store.slug}</Text></View><Pressable disabled={restoreId === store.id} onPress={() => void restore(store)} style={s.restoreButton}><Text style={s.restoreText}>{restoreId === store.id ? "…" : "Восстановить"}</Text></Pressable></View>)}</View> : null}
    <View style={s.card}><Text style={s.label}>Название магазина</Text><TextInput value={name} onChangeText={setName} maxLength={80} placeholder="Например, Nurlanshop" style={s.input}/><Text style={s.label}>Что вы продаёте?</Text><View style={s.options}>{options.map(item => <Pressable key={item.key} onPress={() => setVertical(item.key)} style={[s.option, vertical === item.key && s.optionActive]}><Text style={[s.optionTitle, vertical === item.key && s.optionTitleActive]}>{item.label}</Text><Text style={[s.optionHint, vertical === item.key && s.optionHintActive]}>{item.hint}</Text></Pressable>)}</View><Pressable disabled={pending || !vertical} onPress={() => void create()} style={[s.button, !vertical && { opacity: .45 }]}>{pending ? <ActivityIndicator color="white"/> : <Text style={s.buttonText}>Продолжить настройку</Text>}</Pressable></View>
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({page:{flex:1,backgroundColor:"white"},content:{padding:24,paddingBottom:40,gap:14},back:{width:44,height:44,borderRadius:22,backgroundColor:colors.navySoft,alignItems:"center",justifyContent:"center"},backText:{fontSize:32,lineHeight:34,color:colors.navyDark},kicker:{marginTop:4,color:colors.navy,fontSize:10,fontWeight:"900",letterSpacing:1.5},title:{fontSize:34,fontWeight:"900",color:colors.ink,letterSpacing:-1.2},copy:{color:colors.muted,fontSize:15,lineHeight:23},card:{borderWidth:1,borderColor:colors.line,borderRadius:24,padding:18,gap:14},label:{fontSize:13,fontWeight:"900",color:colors.ink},input:{minHeight:54,borderWidth:1,borderColor:colors.line,borderRadius:14,paddingHorizontal:14,fontSize:16},options:{gap:9},option:{padding:14,borderRadius:15,borderWidth:1,borderColor:colors.line,backgroundColor:"white"},optionActive:{borderColor:colors.navy,backgroundColor:colors.navySoft},optionTitle:{fontWeight:"900",color:colors.ink},optionTitleActive:{color:colors.navyDark},optionHint:{fontSize:12,color:colors.muted,marginTop:3},optionHintActive:{color:colors.navy},button:{minHeight:54,borderRadius:14,backgroundColor:colors.navy,alignItems:"center",justifyContent:"center",marginTop:4},buttonText:{color:"white",fontWeight:"900"},archiveBlock:{gap:9,borderWidth:1,borderColor:"#CFE4D8",backgroundColor:"#F3FBF6",borderRadius:22,padding:16},archiveHeading:{fontSize:17,fontWeight:"900",color:"#28543D"},archiveRow:{flexDirection:"row",gap:10,alignItems:"center",borderTopWidth:1,borderTopColor:"#DCECE2",paddingTop:10},restoreButton:{minHeight:40,borderRadius:12,backgroundColor:"#28543D",paddingHorizontal:12,alignItems:"center",justifyContent:"center"},restoreText:{color:"white",fontSize:11,fontWeight:"900"}});
