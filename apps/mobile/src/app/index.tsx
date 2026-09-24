import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { loadOwnerContext, type OwnerStore } from "@/lib/owner";
import { colors, site } from "@/lib/theme";
import { notificationTarget } from "@/lib/notification-target";
import { disableCurrentDevicePush } from "@/lib/notifications";
import { clearOrdersWidget } from "@/widgets/orders-widget";
import logoMark from "../../assets/images/logo-mark-compact.png";

type Role = "customer" | "owner" | "superadmin";
type Counts={products:number;orders:number;customers:number;newOrders:number};
const emptyCounts:Counts={products:0,orders:0,customers:0,newOrders:0};

function PrimaryButton({label,onPress,muted=false}:{label:string;onPress:()=>void;muted?:boolean}){return <Pressable onPress={onPress} style={({pressed})=>[styles.button,muted&&styles.buttonMuted,pressed&&styles.pressed]}><Text style={[styles.buttonText,muted&&styles.buttonMutedText]}>{label}</Text></Pressable>}
function ModuleCard({title,description,metric,onPress,wide=false}:{title:string;description:string;metric?:string;onPress:()=>void;wide?:boolean}){return <Pressable onPress={onPress} style={({pressed})=>[styles.module,wide&&styles.moduleWide,pressed&&styles.pressed]}><View style={{flex:1,gap:6}}><Text style={styles.moduleTitle}>{title}</Text><Text style={styles.moduleDescription}>{description}</Text></View>{metric?<Text style={styles.metric}>{metric}</Text>:<Text style={styles.arrow}>→</Text>}</Pressable>}

export default function HomeScreen(){
  const params=useLocalSearchParams<{orderId?:string;tenantId?:string}>();
  const[user,setUser]=useState<User|null>(null);const[role,setRole]=useState<Role>("customer");const[stores,setStores]=useState<OwnerStore[]>([]);const[counts,setCounts]=useState<Counts>(emptyCounts);
  const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[loading,setLoading]=useState(true);const[signingIn,setSigningIn]=useState(false);const[refreshing,setRefreshing]=useState(false);
  const load=useCallback(async()=>{
    if(!supabase){setLoading(false);setRefreshing(false);return;}
    try{
      const context=await loadOwnerContext();setUser(context.user);setRole(context.role);setStores(context.stores);
      const ids=context.stores.map(store=>store.id);
      if(ids.length){
        const [{count:products},{count:orders},{count:customers},{count:newOrders}]=await Promise.all([
          supabase.from("products").select("id",{count:"exact",head:true}).in("tenant_id",ids),
          supabase.from("orders").select("id",{count:"exact",head:true}).in("tenant_id",ids),
          supabase.from("customers").select("id",{count:"exact",head:true}).in("tenant_id",ids),
          supabase.from("orders").select("id",{count:"exact",head:true}).in("tenant_id",ids).eq("status","new"),
        ]);setCounts({products:products??0,orders:orders??0,customers:customers??0,newOrders:newOrders??0});
      }else setCounts(emptyCounts);
    }catch{const {data:{user:current}}=await supabase.auth.getUser();setUser(current??null);setRole("customer");setStores([]);setCounts(emptyCounts);}
    finally{setLoading(false);setRefreshing(false);}
  },[]);
  useEffect(()=>{void load();const client=supabase;if(!client)return;const{data}=client.auth.onAuthStateChange((_event,session)=>{setUser(session?.user??null);if(session)setTimeout(()=>void load(),0);else{setRole("customer");setStores([]);setCounts(emptyCounts);setLoading(false);}});return()=>data.subscription.unsubscribe();},[load]);
  useEffect(()=>{const target=notificationTarget(params);if(user&&target)router.replace({pathname:"/order",params:target});},[user,params]);
  const signIn=async()=>{if(!supabase)return;if(!email.trim()||!password){Alert.alert("Заполните данные","Укажите email и пароль от кабинета Dukenim.");return;}setSigningIn(true);const{error}=await supabase.auth.signInWithPassword({email:email.trim(),password});setSigningIn(false);if(error)Alert.alert("Не удалось войти","Проверьте email, пароль и интернет.");else setPassword("");};
  const signOut=async()=>{try{await disableCurrentDevicePush();const result=await supabase?.auth.signOut();if(result?.error)throw result.error;clearOrdersWidget();setUser(null);setRole("customer");setStores([]);}catch{Alert.alert("Не удалось завершить выход","Проверьте интернет и повторите выход.");}};
  const open=(path:string)=>{void Linking.openURL(`${site}${path}`);};
  if(loading)return <View style={styles.loader}><ActivityIndicator color={colors.navy}/></View>;
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content} refreshControl={user?<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);void load();}} tintColor={colors.navy}/>:undefined}>
    <View style={styles.brand}><View style={styles.mark}><Image accessibilityIgnoresInvertColors alt="" source={logoMark} resizeMode="contain" style={styles.markImage}/></View><View><Text style={styles.brandLabel}>РАБОЧИЙ КАБИНЕТ</Text><Text style={styles.brandName}>Dukenim</Text></View></View>
    {!isSupabaseConfigured?<View style={styles.card}><Text style={styles.cardTitle}>Нужна настройка среды</Text><Text style={styles.muted}>Публичные параметры Supabase не добавлены в сборку.</Text></View>:user?<>
      <View style={styles.hero}><Text style={styles.eyebrow}>{role==="superadmin"?"СУПЕРАДМИНИСТРАТОР":role==="owner"?"ВЛАДЕЛЕЦ":"АККАУНТ"}</Text><Text style={styles.welcome}>Ваш бизнес{stores.length>1?` · ${stores.length} магазина`:""}</Text><Text style={styles.heroCopy}>{stores[0]?.name??user.email}</Text><View style={styles.heroStats}><View><Text style={styles.statNumber}>{counts.newOrders}</Text><Text style={styles.statLabel}>новых заказов</Text></View><View><Text style={styles.statNumber}>{counts.products}</Text><Text style={styles.statLabel}>позиций</Text></View><View><Text style={styles.statNumber}>{counts.customers}</Text><Text style={styles.statLabel}>клиентов</Text></View></View></View>
      {stores.length===0?<View style={styles.notice}><Text style={styles.noticeTitle}>У аккаунта пока нет магазина</Text><Text style={styles.muted}>Создайте магазин на сайте, затем обновите этот экран.</Text><PrimaryButton label="Создать магазин ↗" onPress={()=>open("/onboarding")}/></View>:null}
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Управление магазином</Text><Text style={styles.sectionHint}>Всё главное на одном экране</Text></View>
      <View style={styles.modules}>
        <ModuleCard title="Каталог" description="Товары, блюда и остатки" metric={String(counts.products)} onPress={()=>router.push("/catalog" as never)}/>
        <ModuleCard title="Заказы" description="Новые и текущие" metric={counts.newOrders?`${counts.newOrders} новых`:String(counts.orders)} onPress={()=>router.push("/orders")}/>
        <ModuleCard title="AI Studio" description="Дизайн, тексты и рекомендации" wide onPress={()=>open("/admin/ai-studio")}/>
        <ModuleCard title="Склад" description="Наличие и движения" onPress={()=>open("/admin/stock")}/>
        <ModuleCard title="Клиенты" description="История и лояльность" onPress={()=>open("/admin/customers")}/>
        <ModuleCard title="Сотрудники" description="Ссылки и права доступа" onPress={()=>open("/admin/team")}/>
        <ModuleCard title="Аналитика" description="Продажи и показатели" onPress={()=>open("/admin/analytics")}/>
        <ModuleCard title="Сканер" description="Найти товар по штрихкоду" onPress={()=>router.push("/scanner")}/>
        <ModuleCard title="Доставка и оплата" description="Kaspi, самовывоз и Яндекс" wide onPress={()=>open("/admin/settings/delivery")}/>
        <ModuleCard title="Предпросмотр магазина" description="Открыть витрину покупателя" wide onPress={()=>open("/store-preview")}/>
      </View>
      {role==="superadmin"?<View style={styles.ownerCard}><View><Text style={styles.ownerCardTitle}>Центр платформы</Text><Text style={styles.ownerCardCopy}>Магазины, пользователи, платежи и аудит Dukenim.</Text></View><Pressable onPress={()=>open("/root")} style={styles.ownerAction}><Text style={styles.ownerActionText}>Открыть →</Text></Pressable></View>:null}
      <Link href="/settings" asChild><Pressable style={styles.settings}><Text style={styles.settingsText}>Уведомления и настройки</Text><Text style={styles.arrow}>→</Text></Pressable></Link>
      <PrimaryButton label="Выйти" onPress={signOut} muted/>
    </>:<View style={styles.loginCard}><Text style={styles.loginTitle}>Вход в кабинет владельца</Text><Text style={styles.muted}>Каталог, заказы, сотрудники и управление магазином доступны с тем же аккаунтом, что и на dukenim.kz.</Text><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#7F8A92" style={styles.input}/><TextInput secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} onSubmitEditing={()=>void signIn()} returnKeyType="go" placeholder="Пароль" placeholderTextColor="#7F8A92" style={styles.input}/>{signingIn?<ActivityIndicator color={colors.navy}/>:<PrimaryButton label="Войти" onPress={signIn}/>}<Pressable onPress={()=>open("/login")}><Text style={styles.helpLink}>Забыли пароль? Восстановить ↗</Text></Pressable><Pressable onPress={()=>open("/register")}><Text style={styles.helpLink}>Создать магазин бесплатно ↗</Text></Pressable></View>}
  </ScrollView></SafeAreaView>;
}

const styles=StyleSheet.create({screen:{flex:1,backgroundColor:colors.stone},content:{padding:22,paddingBottom:48,gap:16},loader:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:colors.stone},brand:{flexDirection:"row",alignItems:"center",gap:11,marginTop:4},mark:{width:42,height:42,borderRadius:13,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,alignItems:"center",justifyContent:"center"},markImage:{width:25,height:27},brandLabel:{fontSize:9,fontWeight:"900",letterSpacing:1.35,color:colors.navy},brandName:{fontSize:23,fontWeight:"900",color:colors.ink,letterSpacing:-.7},hero:{marginTop:8,borderRadius:24,backgroundColor:colors.navyDark,padding:22,gap:8},eyebrow:{color:"#C7D8E4",fontSize:10,fontWeight:"900",letterSpacing:1.45},welcome:{color:"white",fontSize:30,fontWeight:"900",letterSpacing:-1},heroCopy:{color:"#D9E3E9",fontSize:14},heroStats:{flexDirection:"row",gap:22,marginTop:15,paddingTop:15,borderTopWidth:1,borderTopColor:"#315069"},statNumber:{color:"white",fontSize:21,fontWeight:"900"},statLabel:{color:"#B8CAD6",fontSize:10,marginTop:2},sectionHead:{marginTop:6,flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between",gap:12},sectionTitle:{fontSize:22,fontWeight:"900",color:colors.ink},sectionHint:{fontSize:11,color:colors.muted},modules:{flexDirection:"row",flexWrap:"wrap",gap:10},module:{width:"48%",minHeight:132,borderRadius:19,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,padding:16,gap:12},moduleWide:{width:"100%",minHeight:96,flexDirection:"row",alignItems:"center"},moduleTitle:{fontSize:17,fontWeight:"900",color:colors.ink},moduleDescription:{fontSize:12,lineHeight:17,color:colors.muted},metric:{alignSelf:"flex-start",color:colors.navy,fontSize:13,fontWeight:"900",backgroundColor:colors.navySoft,borderRadius:99,paddingHorizontal:9,paddingVertical:5},arrow:{fontSize:21,fontWeight:"700",color:colors.navy},pressed:{opacity:.72,transform:[{scale:.985}]},ownerCard:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:14,backgroundColor:colors.navySoft,borderRadius:19,padding:18},ownerCardTitle:{fontSize:17,fontWeight:"900",color:colors.navyDark},ownerCardCopy:{fontSize:12,lineHeight:17,color:colors.muted,maxWidth:220,marginTop:4},ownerAction:{backgroundColor:colors.navy,borderRadius:12,padding:12},ownerActionText:{color:"white",fontWeight:"900"},settings:{minHeight:58,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderWidth:1,borderColor:colors.line,borderRadius:16,paddingHorizontal:17,backgroundColor:colors.paper},settingsText:{fontWeight:"900",color:colors.ink},button:{backgroundColor:colors.navy,borderRadius:14,paddingVertical:16,alignItems:"center"},buttonText:{color:"white",fontWeight:"900",fontSize:15},buttonMuted:{backgroundColor:"transparent",borderWidth:1,borderColor:"#AEBBC4"},buttonMutedText:{color:colors.navyDark},card:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:22,padding:20,gap:12},cardTitle:{fontSize:18,fontWeight:"900",color:colors.ink},muted:{fontSize:14,lineHeight:21,color:colors.muted},notice:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:18,gap:12},noticeTitle:{fontSize:18,fontWeight:"900",color:colors.ink},loginCard:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:24,padding:20,gap:14},loginTitle:{fontSize:23,fontWeight:"900",color:colors.ink},input:{minHeight:54,backgroundColor:"white",borderRadius:13,borderWidth:1,borderColor:"#C9D3DA",paddingHorizontal:14,color:colors.ink,fontSize:16},helpLink:{color:colors.navy,fontSize:13,fontWeight:"800",textDecorationLine:"underline"}});

