import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadOwnerContext, type OwnerStore } from "@/lib/owner";
import { colors, money } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/app-shell";

type Product = { id:string; tenant_id:string; title:string; description:string|null; price:number; is_active:boolean; images:string[]; created_at:string };
type Variant = { product_id:string; stock_qty:number; is_active:boolean };

export default function CatalogScreen() {
  const [stores,setStores]=useState<OwnerStore[]>([]);
  const [storeId,setStoreId]=useState("");
  const [products,setProducts]=useState<Product[]>([]);
  const [variants,setVariants]=useState<Variant[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [message,setMessage]=useState("");
  const load=useCallback(async(quiet=false)=>{
    if(!quiet)setLoading(true);setMessage("");
    try{
      const context=await loadOwnerContext();
      setStores(context.stores);
      const selected=context.stores.some(store=>store.id===storeId)?storeId:context.stores[0]?.id??"";
      setStoreId(selected);
      if(!selected){setProducts([]);setVariants([]);setMessage("Сначала создайте магазин в Dukenim.");return;}
      const selectedStore=context.stores.find(item=>item.id===selected);
      if(selectedStore?.catalog_status==="not_started"){router.replace("/catalog-builder" as never);return;}
      const [{data:productRows,error:productError},{data:variantRows,error:variantError}]=await Promise.all([
        supabase!.from("products").select("id,tenant_id,title,description,price,is_active,images,created_at").eq("tenant_id",selected).order("created_at",{ascending:false}),
        supabase!.from("product_variants").select("product_id,stock_qty,is_active").eq("tenant_id",selected),
      ]);
      if(productError||variantError)throw new Error("Не удалось загрузить каталог.");
      setProducts((productRows??[]) as Product[]);setVariants((variantRows??[]) as Variant[]);
    }catch(error){setMessage(error instanceof Error?error.message:"Не удалось открыть каталог.");}
    finally{setLoading(false);setRefreshing(false);}
  },[storeId]);
  useEffect(()=>{void load();},[load]);
  const stock=useMemo(()=>Object.fromEntries(products.map(product=>[product.id,variants.filter(v=>v.product_id===product.id&&v.is_active).reduce((sum,v)=>sum+v.stock_qty,0)])),[products,variants]);
  const store=stores.find(item=>item.id===storeId);
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);void load(true);}} tintColor={colors.navy}/>}>
    <View style={styles.top}><Link href="/" style={styles.back}>← Кабинет</Link><Text style={styles.kicker}>КАТАЛОГ</Text></View>
    <Text style={styles.title}>Товары и блюда</Text><Text style={styles.subtitle}>Добавляйте позиции прямо в приложении. Они сразу появляются в том же каталоге, что и на сайте.</Text>
    {stores.length>1&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeTabs}>{stores.map(item=><Pressable key={item.id} onPress={()=>setStoreId(item.id)} style={[styles.storeTab,item.id===storeId&&styles.storeTabActive]}><Text style={[styles.storeTabText,item.id===storeId&&styles.storeTabTextActive]}>{item.name}</Text></Pressable>)}</ScrollView>}
    {store&&<View style={styles.storeBar}><View><Text style={styles.storeName}>{store.name}</Text><Text style={styles.storeMeta}>{store.catalog_published?"Опубликован":"Виден только вам"} · {products.length} поз.</Text></View><Link href={{pathname:"/product-new",params:{tenantId:store.id,tenantName:store.name}} as never} asChild><Pressable style={styles.add}><Text style={styles.addText}>＋ Добавить</Text></Pressable></Link></View>}
    {loading&&<ActivityIndicator color={colors.navy} style={{marginTop:32}}/>}
    {!loading&&message?<View style={styles.notice}><Text style={styles.noticeText}>{message}</Text></View>:null}
    {!loading&&!message&&products.length===0?<View style={styles.empty}><Text style={styles.emptyTitle}>Каталог пока пуст</Text><Text style={styles.subtitle}>Создайте первую позицию: название, цена и остаток сохранятся в магазине.</Text>{store&&<Link href={{pathname:"/product-new",params:{tenantId:store.id,tenantName:store.name}} as never} asChild><Pressable style={styles.primary}><Text style={styles.primaryText}>Добавить первый товар</Text></Pressable></Link>}</View>:null}
    <View style={styles.list}>{products.map(product=><Link key={product.id} href={{pathname:"/product-edit",params:{productId:product.id,tenantId:product.tenant_id}} as never} asChild><Pressable style={styles.product}><View style={styles.thumb}><Text style={styles.thumbText}>{product.title.slice(0,1).toUpperCase()}</Text></View><View style={{flex:1,gap:5}}><View style={styles.productTop}><Text numberOfLines={2} style={styles.productTitle}>{product.title}</Text><Text style={styles.price}>{money(product.price)}</Text></View><Text style={styles.meta}>Остаток: {stock[product.id]??0} · {product.is_active?"В продаже":"Скрыт"} · Нажмите для изменения</Text></View></Pressable></Link>)}</View>
  </ScrollView><BottomNav/></SafeAreaView>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:colors.stone},content:{padding:22,paddingBottom:115,gap:15},top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},back:{color:colors.navy,fontWeight:"800",fontSize:14},kicker:{color:colors.navy,fontSize:11,fontWeight:"900",letterSpacing:1.4},title:{fontSize:34,fontWeight:"900",color:colors.ink,letterSpacing:-1},subtitle:{fontSize:15,lineHeight:22,color:colors.muted},storeTabs:{gap:8},storeTab:{borderWidth:1,borderColor:colors.line,borderRadius:999,paddingHorizontal:14,paddingVertical:10,backgroundColor:colors.paper},storeTabActive:{backgroundColor:colors.navy,borderColor:colors.navy},storeTabText:{color:colors.ink,fontWeight:"700"},storeTabTextActive:{color:"white"},storeBar:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:18,padding:16},storeName:{fontSize:18,fontWeight:"900",color:colors.ink},storeMeta:{fontSize:12,color:colors.muted,marginTop:3},add:{backgroundColor:colors.navy,borderRadius:12,paddingHorizontal:14,paddingVertical:12},addText:{color:"white",fontWeight:"900"},list:{gap:10},product:{flexDirection:"row",gap:13,alignItems:"center",backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:18,padding:13},thumb:{width:54,height:54,borderRadius:14,backgroundColor:colors.navySoft,alignItems:"center",justifyContent:"center"},thumbText:{fontSize:19,fontWeight:"900",color:colors.navy},productTop:{flexDirection:"row",gap:8,justifyContent:"space-between",alignItems:"flex-start"},productTitle:{flex:1,fontSize:16,fontWeight:"800",color:colors.ink},price:{fontSize:14,fontWeight:"900",color:colors.ink},meta:{fontSize:12,color:colors.muted},notice:{padding:16,borderRadius:16,backgroundColor:"#F9E7E5"},noticeText:{color:colors.danger,lineHeight:20},empty:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:22,gap:12},emptyTitle:{fontSize:21,fontWeight:"900",color:colors.ink},primary:{alignSelf:"flex-start",backgroundColor:colors.navy,borderRadius:12,paddingHorizontal:16,paddingVertical:13},primaryText:{color:"white",fontWeight:"900"}});


