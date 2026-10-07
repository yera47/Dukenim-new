import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { AppText as Text } from "@/components/app-text";
import { router, useLocalSearchParams } from "expo-router";
import { AppScreen, ui } from "@/components/app-shell";
import { useOwnerStore } from "@/lib/use-owner-store";
import { colors, money } from "@/lib/theme";
import { disableCurrentDevicePush } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { clearOrdersWidget } from "@/widgets/orders-widget";
import businessKit from "../../assets/images/dukenim-business-kit-v1.png";
import { bulkaMerchantPreviewStore, merchantPreviewImages, merchantPreviewStore } from "@/lib/merchant-preview";
import { useBrandDoorMotion } from "@/components/brand-door-motion";

type Order = { id: string; order_number: number | null; status: string; payment_status: string; total: number; created_at: string };
type RecentOrder = {id:string;number:number|null;status:string;total:number;createdAt:string;title:string;image:string|null};
type HomeStats = { todayRevenue: number; todayOrders: number; statusCounts:{new:number;active:number;done:number}; products: number; lowStock: number; daily: { day: string; amount: number }[]; recentOrders:RecentOrder[] };
const DAY = 86_400_000;
const previewStats:HomeStats={todayRevenue:58500,todayOrders:3,statusCounts:{new:2,active:1,done:0},products:12,lowStock:1,daily:[12,18,16,24,21,31,58].map((amount,index)=>({day:`2026-10-${String(index+1).padStart(2,"0")}`,amount:amount*1000})),recentOrders:[{id:"preview-order-1",number:104,status:"new",total:22000,createdAt:"2026-10-01T09:30:00Z",title:"Нежная композиция",image:merchantPreviewImages[0]},{id:"preview-order-2",number:103,status:"confirmed",total:36500,createdAt:"2026-10-01T08:10:00Z",title:"Белые тюльпаны",image:merchantPreviewImages[1]}]};
const kzDay = (time: number) => new Date(time + 5 * 3_600_000).toISOString().slice(0, 10);
async function loadStats(tenantId: string): Promise<HomeStats> {
  if (!supabase) throw new Error("Нет подключения к данным.");
  const now = Date.now();
  const today = kzDay(now);
  const todayStart = Date.parse(`${today}T00:00:00+05:00`);
  const weekStart = todayStart - 6 * DAY;
  const orders: Order[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    let query = supabase.from("orders").select("id,order_number,status,payment_status,total,created_at").eq("tenant_id", tenantId).gte("created_at", new Date(weekStart).toISOString()).order("id", { ascending: true }).limit(1000);
    if (cursor) query = query.gt("id", cursor);
    const result = await query;
    if (result.error || !result.data) throw new Error("Не удалось загрузить сводку заказов.");
    orders.push(...result.data as Order[]);
    if (result.data.length < 1000) break;
    cursor = result.data[result.data.length - 1].id;
    if (page === 99) throw new Error("Для сводки нужен расширенный отчёт.");
  }
  const [productResult, lowResult] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("product_variants").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true).gt("stock_qty", 0).lte("stock_qty", 3),
  ]);
  if (productResult.error || lowResult.error) throw new Error("Не удалось загрузить каталог и остатки.");
  const byDay = new Map<string, number>();
  let todayRevenue = 0;
  let todayOrders = 0;
  const statusCounts={new:0,active:0,done:0};
  for (const order of orders) {
    const day = kzDay(Date.parse(order.created_at));
    if (day === today) {
      todayOrders++;
      if(order.status === "new")statusCounts.new++;
      else if(["confirmed","assembled","delivering"].includes(order.status))statusCounts.active++;
      else if(order.status === "done")statusCounts.done++;
    }
    if (order.payment_status !== "paid" || order.status === "cancelled") continue;
    if (!Number.isSafeInteger(order.total) || order.total < 0) throw new Error("В заказах найдена некорректная сумма.");
    byDay.set(day, (byDay.get(day) ?? 0) + order.total);
    if (day === today) todayRevenue += order.total;
  }
  const recent=orders.slice().sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).slice(0,4);
  let recentOrders:RecentOrder[]=recent.map(order=>({id:order.id,number:order.order_number,status:order.status,total:order.total,createdAt:order.created_at,title:"Заказ",image:null}));
  if(recent.length){
    const itemResult=await supabase.from("order_items").select("order_id,title_snapshot,variant_id").eq("tenant_id",tenantId).in("order_id",recent.map(order=>order.id));
    if(itemResult.error)throw new Error("Не удалось загрузить состав последних заказов.");
    const items=(itemResult.data??[]) as Array<{order_id:string;title_snapshot:string;variant_id:string|null}>;
    const variantIds=items.map(item=>item.variant_id).filter((id):id is string=>Boolean(id));
    const imageByVariant=new Map<string,string>();
    if(variantIds.length){
      const variantResult=await supabase.from("product_variants").select("id,product_id").eq("tenant_id",tenantId).in("id",variantIds);
      if(variantResult.error)throw new Error("Не удалось загрузить фотографии последних заказов.");
      const variants=(variantResult.data??[]) as Array<{id:string;product_id:string}>;
      const productIds=Array.from(new Set(variants.map(variant=>variant.product_id)));
      const productResult=productIds.length?await supabase.from("products").select("id,images").eq("tenant_id",tenantId).in("id",productIds):{data:[],error:null};
      if(productResult.error)throw new Error("Не удалось загрузить фотографии последних заказов.");
      const imageByProduct=new Map(((productResult.data??[]) as Array<{id:string;images:string[]|null}>).map(product=>[product.id,product.images?.[0]??""]));
      variants.forEach(variant=>{const image=imageByProduct.get(variant.product_id);if(image)imageByVariant.set(variant.id,image);});
    }
    recentOrders=recentOrders.map(order=>{const item=items.find(candidate=>candidate.order_id===order.id);return {...order,title:item?.title_snapshot??order.title,image:item?.variant_id?imageByVariant.get(item.variant_id)??null:null};});
  }
  return { todayRevenue, todayOrders, statusCounts, products: productResult.count ?? 0, lowStock: lowResult.count ?? 0, daily: Array.from({ length: 7 }, (_, index) => { const day = kzDay(weekStart + index * DAY); return { day, amount: byDay.get(day) ?? 0 }; }),recentOrders };
}

export default function More() {
  const{playExit,showStatic}=useBrandDoorMotion();
  const {uiPreview,brand,doorPreview}=useLocalSearchParams<{uiPreview?:string;brand?:string;doorPreview?:string}>();
  const previewFixture=Platform.OS==="web"&&uiPreview==="390";
  useEffect(()=>{
    if(!previewFixture)return;
    if(doorPreview==="static"){showStatic();return;}
    if(doorPreview==="motion"){const timer=setTimeout(()=>{void playExit();},800);return()=>clearTimeout(timer);}
  },[doorPreview,playExit,previewFixture,showStatic]);
  const previewStore=brand==="bulka"?bulkaMerchantPreviewStore:merchantPreviewStore;
  const { context:loadedContext, store:loadedStore, select } = useOwnerStore(previewFixture?previewStore:undefined);
  const context=previewFixture?{role:"owner" as const,stores:[previewStore]}:loadedContext;
  const store=previewFixture?previewStore:loadedStore;
  const [signingOut, setSigningOut] = useState(false);
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    setStats(null); setStatsError("");
    if(previewFixture){setStats(previewStats);return;}
    if (!store) return;
    setStatsLoading(true);
    try { const next = await loadStats(store.id); if (current === requestId.current) setStats(next); }
    catch (cause) { if (current === requestId.current) setStatsError(cause instanceof Error ? cause.message : "Сводка недоступна."); }
    finally { if (current === requestId.current) setStatsLoading(false); }
  }, [previewFixture,store]);
  useEffect(() => { void load(); }, [load]);
  const max = Math.max(1, ...(stats?.daily.map(item => item.amount) ?? []));
  const signOut = () => {
    if (signingOut) return;
    Alert.alert("Выйти из Dukenim?", "Уведомления на этом устройстве будут отключены.", [{ text: "Отмена", style: "cancel" }, { text: "Выйти", style: "destructive", onPress: async () => {
      setSigningOut(true);
      try { if (!supabase) throw new Error("Подключение недоступно"); await playExit(); await disableCurrentDevicePush(); const { error } = await supabase.auth.signOut(); if (error) throw error; clearOrdersWidget(); router.replace("/"); }
      catch { Alert.alert("Не удалось выйти", "Проверьте соединение и повторите. Для безопасного выхода нужно отключить уведомления этого телефона."); }
      finally { setSigningOut(false); }
    } }]);
  };
  return <AppScreen section="Главная" store={store?.name} logoUrl={store?.logo_url}>
    {previewFixture?<View style={s.fixture}><Text style={s.fixtureText}>ДЕМО-ДАННЫЕ · НАСТРОЕННЫЙ МАГАЗИН</Text></View>:null}
    <View style={s.hero}><View style={s.heroCopy}><Text style={s.storeEyebrow}>{context?.role === "owner" ? "ВЛАДЕЛЕЦ" : "ВАШ МАГАЗИН"}</Text><Text style={s.heroTitle}>Ваш бизнес</Text><Text numberOfLines={1} style={s.heroStore}>{store?.name || "Dukenim"}</Text><Text style={s.heroText}>{store?.catalog_published ? "Витрина опубликована" : "Закончите оформление и добавьте первый товар"}</Text></View><View style={s.heroArtSurface}>{stats?.recentOrders.find(order=>order.image)?.image?<ExpoImage source={{uri:stats.recentOrders.find(order=>order.image)!.image!}} contentFit="cover" accessibilityLabel="Товар из последнего заказа" style={s.heroArtImage}/>:<ExpoImage source={businessKit} contentFit="contain" accessibilityLabel="Иллюстрация инструментов магазина" style={s.heroArtImage}/>}</View>{stats ? <><View style={s.heroDivider} /><View style={s.heroMetrics}><HeroMetric label="Оплачено сегодня" value={money(stats.todayRevenue)} /><HeroMetric label="Заказов" value={String(stats.todayOrders)} /><HeroMetric label="Позиций" value={String(stats.products)} /></View></> : null}</View>
    <View style={s.sectionHead}><View><Text style={s.sectionTitle}>Сегодня</Text><Text style={s.sectionCopy}>Заказы, оплаты и остатки вашего магазина</Text></View><Pressable onPress={() => void load()}><Text style={s.refresh}>Обновить ↻</Text></Pressable></View>
    {statsLoading ? <ActivityIndicator color={colors.navy} /> : null}
    {statsError ? <View style={s.errorCard}><Text style={ui.error}>{statsError}</Text><Text style={s.sectionCopy}>Показатели скрыты, пока данные не загрузятся полностью.</Text></View> : null}
    {stats ? <>
      <View style={s.metrics}><Metric label="Новые" value={String(stats.statusCounts.new)} accent /><Metric label="В работе" value={String(stats.statusCounts.active)} /><Metric label="Завершены" value={String(stats.statusCounts.done)} /></View>
      <View style={s.ordersBlock}><View style={s.ordersHead}><View><Text style={s.cardTitle}>Последние заказы</Text><Text style={s.sectionCopy}>Новые и активные заказы магазина</Text></View><Pressable onPress={()=>router.push("/orders" as never)}><Text style={s.cardLink}>Все →</Text></Pressable></View>{stats.recentOrders.length?stats.recentOrders.map(order=><RecentOrderRow key={order.id} order={order} tenantId={store?.id} preview={previewFixture}/>):<View style={s.emptyOrders}><Text style={s.emptyTitle}>Заказов пока нет</Text><Text style={s.sectionCopy}>Новые заказы появятся здесь после оформления покупателем.</Text></View>}</View>
      {stats.lowStock>0?<Pressable testID="dashboard-low-stock" onPress={()=>router.push("/stock" as never)} style={({pressed})=>[s.stockAlert,pressed&&ui.pressed]}><View><Text style={s.stockTitle}>Низкий остаток · {stats.lowStock}</Text><Text style={s.sectionCopy}>Проверьте варианты, где осталось не больше трёх единиц</Text></View><Text style={s.stockArrow}>›</Text></Pressable>:null}
      <Pressable accessibilityRole="button" onPress={()=>router.push("/studio" as never)} style={({pressed})=>[s.studioBanner,pressed&&ui.pressed]}><View style={s.studioMark}><Text style={s.studioMarkText}>✦</Text></View><View style={{flex:1}}><Text style={s.studioTitle}>AI Studio</Text><Text style={s.studioCopy}>Настройте оформление магазина и проверьте витрину перед публикацией</Text></View><Text style={s.studioArrow}>›</Text></Pressable>
      <View style={s.chartCard}><View style={s.chartHead}><View><Text style={s.cardTitle}>Продажи за 7 дней</Text><Text style={s.sectionCopy}>Только оплаченные, без отмен</Text></View><Pressable onPress={() => router.push("/analytics" as never)}><Text style={s.cardLink}>Подробнее →</Text></Pressable></View><View style={s.chart}>{stats.daily.map(item => <View key={item.day} style={s.chartColumn}><View style={s.barArea}><View style={[s.bar, { height: Math.max(4, item.amount / max * 68) }]} /></View><Text style={s.day}>{item.day.slice(8)}</Text></View>)}</View></View>
    </> : null}
    {store ? <View style={s.catalogCard}><View style={s.catalogTop}><View style={{ flex: 1 }}><Text style={s.storeEyebrow}>КАТАЛОГ</Text><Text style={s.catalogTitle}>{stats ? `${stats.products} позиций` : store.name}</Text><Text style={s.catalogMeta}>{store.catalog_published ? "Витрина опубликована" : "Витрина пока видна только вам"}</Text></View><Text style={[s.publication, store.catalog_published && s.publicationOn]}>{store.catalog_published ? "В эфире" : "Черновик"}</Text></View><View style={s.catalogActions}><HomeAction title="Добавить товар" copy="Фото, цена и остаток" onPress={() => router.push({ pathname: "/product-new", params: { tenantId: store.id, tenantName: store.name, vertical: store.business_vertical ?? "other" } } as never)} primary /><HomeAction title="Товары" copy="Изменить карточки" onPress={() => router.push("/catalog" as never)} /><HomeAction title="Дизайн" copy="Шаблон, цвета и обложка" onPress={() => router.push("/brand" as never)} /><HomeAction title="Предпросмотр" copy="Открыть глазами покупателя" onPress={() => router.push("/preview" as never)} /><HomeAction title="Ссылка" copy="Скопировать и поделиться" onPress={() => router.push("/store-link" as never)} wide /></View></View> : null}
    {(context?.stores.length ?? 0) > 1 ? <View style={s.switcher}><Text style={s.groupTitle}>ВЫБРАННЫЙ МАГАЗИН</Text><View style={s.storeChips}>{context!.stores.map(item => <Pressable key={item.id} onPress={() => select(item)} style={[s.storeChip, item.id === store?.id && s.storeChipOn]}><Text style={[s.storeChipText, item.id === store?.id && s.storeChipTextOn]}>{item.name}</Text></Pressable>)}</View></View> : null}
    <Pressable disabled={signingOut} onPress={signOut} style={ui.outline}><Text style={ui.outlineText}>{signingOut ? "Выходим…" : "Выйти из аккаунта"}</Text></Pressable>
  </AppScreen>;
}

function Metric({ label, value, accent = false, warn = false }: { label: string; value: string; accent?: boolean; warn?: boolean }) { return <View style={[s.metric, accent && s.metricAccent, warn && s.metricWarn]}><Text numberOfLines={1} adjustsFontSizeToFit style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>; }
function HeroMetric({ label, value }: { label: string; value: string }) { return <View style={s.heroMetric}><Text adjustsFontSizeToFit numberOfLines={1} style={s.heroMetricValue}>{value}</Text><Text style={s.heroMetricLabel}>{label}</Text></View>; }
const statusLabels:Record<string,string>={new:"Новый",confirmed:"Подтверждён",assembled:"Собран",delivering:"Доставляется",done:"Завершён",cancelled:"Отменён"};
function RecentOrderRow({order,tenantId,preview}:{order:RecentOrder;tenantId?:string;preview:boolean}){
  const time=new Date(order.createdAt).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Almaty"});
  const open=()=>{if(!preview&&tenantId)router.push({pathname:"/order",params:{orderId:order.id,tenantId}} as never);};
  return <Pressable accessibilityRole="button" onPress={open} style={({pressed})=>[s.orderRow,pressed&&ui.pressed]}>{order.image?<ExpoImage source={{uri:order.image}} contentFit="cover" accessibilityLabel={order.title} style={s.orderImage}/>:<View style={s.orderImageFallback}><Text style={s.orderImageText}>D</Text></View>}<View style={s.orderCopy}><View style={s.orderTitleLine}><Text numberOfLines={1} style={s.orderTitle}>Заказ {order.number?`№${order.number}`:""}</Text><Text style={s.orderTime}>{time}</Text></View><Text numberOfLines={1} style={s.orderProduct}>{order.title}</Text><View style={s.orderMeta}><Text style={[s.statusPill,order.status==="new"&&s.statusNew]}>{statusLabels[order.status]??order.status}</Text><Text style={s.orderTotal}>{money(order.total)}</Text></View></View><Text style={s.orderArrow}>›</Text></Pressable>;
}
function HomeAction({ title, copy, onPress, primary = false, wide = false }: { title: string; copy: string; onPress: () => void; primary?: boolean; wide?: boolean }) { return <Pressable onPress={onPress} style={({ pressed }) => [s.homeAction, primary && s.homeActionPrimary, wide && s.homeActionWide, pressed && ui.pressed]}><Text style={[s.homeActionTitle, primary && s.homeActionTitlePrimary]}>{title} →</Text><Text style={[s.homeActionCopy, primary && s.homeActionCopyPrimary]}>{copy}</Text></Pressable>; }

const s = StyleSheet.create({
  fixture:{alignSelf:"flex-start",borderRadius:999,backgroundColor:"#F3E7EE",paddingHorizontal:10,paddingVertical:6},fixtureText:{fontSize:9,fontWeight:"900",letterSpacing:1,color:colors.navy},
  hero: { minHeight: 222, borderRadius: 30, backgroundColor: "#FAEFF5", padding: 20, overflow: "hidden", justifyContent: "center", gap: 16, borderWidth: 1, borderColor: "#F0DCE8" }, heroCopy: { zIndex: 2, width: "64%", gap: 6 }, heroTitle: { fontSize: 30, lineHeight: 34, fontWeight: "900", letterSpacing: -.8, color: colors.ink }, heroStore: { fontSize: 16, fontWeight: "700", color: colors.navyDark }, heroText: { fontSize: 12, lineHeight: 18, color: colors.muted }, heroArtSurface: { position: "absolute", zIndex: 1, width: 142, height: 142, right: -3, top: 9, borderRadius: 28, backgroundColor: "#FFFDFE", overflow: "hidden", borderWidth: 1, borderColor: "#F1E4EB" }, heroArtImage: { width: "100%", height: "100%" }, heroDivider: { height: 1, backgroundColor: "#E7D3DF" }, heroMetrics: { flexDirection: "row", gap: 8 }, heroMetric: { flex: 1, minWidth: 0, gap: 4, backgroundColor: "#FFFFFFB8", borderRadius: 14, padding: 9 }, heroMetricValue: { fontSize: 17, lineHeight: 21, fontWeight: "900", color: colors.ink }, heroMetricLabel: { fontSize: 9, lineHeight: 13, color: colors.muted },
  storeEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.4, color: "#CFAFC2" }, sectionHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }, sectionTitle: { fontSize: 23, fontWeight: "900", letterSpacing: -.5, color: colors.ink }, sectionCopy: { fontSize: 11, lineHeight: 16, color: colors.muted, marginTop: 3 }, refresh: { color: colors.navy, fontSize: 11, fontWeight: "900", paddingVertical: 6 }, errorCard: { borderRadius: 18, borderWidth: 1, borderColor: "#E7DDE3", padding: 15, backgroundColor: "#FBF7F9" },
  metrics: { flexDirection: "row", gap: 8 }, metric: { flex:1, minWidth: 0, minHeight: 78, borderRadius: 18, padding: 12, justifyContent: "center", backgroundColor: "#F4F6F7", borderWidth: 1, borderColor: "#E7ECEF" }, metricAccent: { backgroundColor: "#F6F0F4", borderColor: "#E4D4DE" }, metricWarn: { backgroundColor: "#FFF8EE", borderColor: "#F1DFC0" }, metricValue: { fontSize: 21, fontWeight: "900", color: colors.ink }, metricLabel: { fontSize: 10, color: colors.muted, marginTop: 5 },
  stockAlert:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12,borderRadius:17,paddingHorizontal:15,paddingVertical:12,backgroundColor:"#FFF8EE",borderWidth:1,borderColor:"#F1DFC0"},stockTitle:{fontSize:13,fontWeight:"900",color:colors.ink},stockArrow:{fontSize:24,color:colors.navy},
  ordersBlock:{borderRadius:22,borderWidth:1,borderColor:colors.line,backgroundColor:"white",padding:15,gap:4},ordersHead:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:5},orderRow:{minHeight:82,flexDirection:"row",alignItems:"center",gap:11,paddingVertical:9,borderTopWidth:1,borderTopColor:"#F0EAEE"},orderImage:{width:62,height:62,borderRadius:16,backgroundColor:"#F5F0F3"},orderImageFallback:{width:62,height:62,borderRadius:16,backgroundColor:"#F5F0F3",alignItems:"center",justifyContent:"center"},orderImageText:{fontSize:20,fontWeight:"900",color:colors.navy},orderCopy:{flex:1,minWidth:0,gap:4},orderTitleLine:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},orderTitle:{flex:1,fontSize:14,fontWeight:"900",color:colors.ink},orderTime:{fontSize:10,color:colors.muted},orderProduct:{fontSize:11,color:colors.muted},orderMeta:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},statusPill:{fontSize:9,fontWeight:"900",color:"#735D69",backgroundColor:"#F0EAEE",borderRadius:999,overflow:"hidden",paddingHorizontal:8,paddingVertical:4},statusNew:{color:"#7A294E",backgroundColor:"#F7E5EE"},orderTotal:{fontSize:11,fontWeight:"900",color:colors.ink},orderArrow:{fontSize:24,color:colors.navy},emptyOrders:{paddingVertical:16,gap:3},emptyTitle:{fontSize:14,fontWeight:"900",color:colors.ink},
  studioBanner:{minHeight:92,borderRadius:22,padding:16,backgroundColor:colors.navy,flexDirection:"row",alignItems:"center",gap:13},studioMark:{width:46,height:46,borderRadius:15,backgroundColor:"#FFFFFF1C",alignItems:"center",justifyContent:"center"},studioMarkText:{fontSize:23,color:"white"},studioTitle:{fontSize:18,fontWeight:"900",color:"white"},studioCopy:{fontSize:11,lineHeight:16,color:"#F0E6EC",marginTop:3},studioArrow:{fontSize:28,color:"white"},
  chartCard: { borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 17, backgroundColor: "white", gap: 15 }, chartHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }, cardTitle: { fontSize: 17, fontWeight: "900", color: colors.ink }, cardLink: { color: colors.navy, fontSize: 11, fontWeight: "900", paddingVertical: 4 }, chart: { height: 92, flexDirection: "row", alignItems: "flex-end", gap: 7 }, chartColumn: { flex: 1, alignItems: "center", gap: 5 }, barArea: { height: 68, width: "100%", justifyContent: "flex-end", borderRadius: 7, backgroundColor: "#F5F1F4", overflow: "hidden" }, bar: { width: "100%", minHeight: 4, borderRadius: 7, backgroundColor: colors.navy }, day: { fontSize: 9, fontWeight: "800", color: colors.muted },
  catalogCard: { borderRadius: 26, padding: 18, backgroundColor: "#F7F1F5", gap: 15, borderWidth: 1, borderColor: "#EADDE5" }, catalogTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 }, catalogTitle: { fontSize: 24, fontWeight: "900", color: colors.ink, marginTop: 5 }, catalogMeta: { fontSize: 12, color: colors.muted, marginTop: 3 }, publication: { borderRadius: 999, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#EADDE5", color: colors.navyDark, fontSize: 10, fontWeight: "900" }, publicationOn: { backgroundColor: "#D9EFE2", color: "#28543D" }, catalogActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, homeAction: { width: "48%", minHeight: 78, borderRadius: 16, padding: 12, justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8DCE3" }, homeActionPrimary: { backgroundColor: colors.navy, borderColor: colors.navy }, homeActionWide: { width: "100%" }, homeActionTitle: { fontSize: 13, fontWeight: "900", color: colors.navyDark }, homeActionTitlePrimary: { color: "white" }, homeActionCopy: { fontSize: 10, lineHeight: 14, color: colors.muted, marginTop: 4 }, homeActionCopyPrimary: { color: "#F2E9EF" },
  quickRow: { flexDirection: "row", gap: 9 }, quick: { flex: 1, minHeight: 118, borderRadius: 20, padding: 15, backgroundColor: "#F4F6F7", borderWidth: 1, borderColor: "#E9EEF1", justifyContent: "space-between" }, quickTitle: { fontSize: 17, fontWeight: "900", color: colors.ink }, quickCopy: { fontSize: 11, lineHeight: 16, color: colors.muted }, quickArrow: { fontSize: 22, fontWeight: "900", color: colors.navy },
  switcher: { gap: 8 }, storeChips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, storeChip: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 9 }, storeChipOn: { backgroundColor: colors.navy, borderColor: colors.navy }, storeChipText: { fontSize: 12, fontWeight: "800", color: colors.muted }, storeChipTextOn: { color: "white" }, group: { gap: 8 }, groupTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 1.35, color: colors.navy, marginLeft: 4, marginTop: 4 }, tiles: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, tile: { flexBasis: "46%", flexGrow: 1, flexShrink: 1, minWidth: 0, minHeight: 126, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 14, backgroundColor: "white", justifyContent: "space-between" }, tileWide: { flexBasis: "100%" }, tileHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, icon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.navySoft, alignItems: "center", justifyContent: "center" }, iconText: { fontSize: 18, fontWeight: "900", color: colors.navyDark }, title: { fontSize: 16, fontWeight: "900", color: colors.ink }, copy: { fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 3 }, arrow: { fontSize: 23, fontWeight: "400", color: colors.navy },
});
