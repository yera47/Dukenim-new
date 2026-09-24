import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Category={id:string;name:string};
const integer=(value:string)=>{const normalized=value.replace(/\D/g,"");return normalized?Number(normalized):0;};

export default function NewProductScreen(){
  const {tenantId,tenantName}=useLocalSearchParams<{tenantId:string;tenantName?:string}>();
  const [title,setTitle]=useState("");const[description,setDescription]=useState("");const[price,setPrice]=useState("");const[oldPrice,setOldPrice]=useState("");const[stock,setStock]=useState("1");const[sku,setSku]=useState("");
  const[categories,setCategories]=useState<Category[]>([]);const[categoryId,setCategoryId]=useState<string|null>(null);const[saving,setSaving]=useState(false);
  useEffect(()=>{if(!tenantId||!supabase)return;void supabase.from("categories").select("id,name").eq("tenant_id",tenantId).eq("is_active",true).order("sort_order").then(({data})=>setCategories((data??[]) as Category[]));},[tenantId]);
  const save=async()=>{
    const amount=integer(price),previous=integer(oldPrice),qty=integer(stock);
    if(!tenantId||title.trim().length<2){Alert.alert("Проверьте название","Название должно содержать минимум 2 символа.");return;}
    if(amount<1){Alert.alert("Проверьте цену","Укажите цену товара в тенге.");return;}
    if(previous&&previous<amount){Alert.alert("Проверьте старую цену","Старая цена не может быть ниже текущей.");return;}
    if(qty<0||qty>100000000){Alert.alert("Проверьте остаток","Укажите корректное количество.");return;}
    setSaving(true);
    const {error}=await supabase!.rpc("create_product_with_variants",{p_tenant_id:tenantId,p_title:title.trim(),p_description:description.trim(),p_price:amount,p_old_price:previous||null,p_category_id:categoryId,p_images:[],p_is_active:true,p_variants:[{size:"",color:"",sku:sku.trim(),stock:qty}]});
    setSaving(false);
    if(error){Alert.alert("Не удалось сохранить","Проверьте данные и повторите. Товар не был создан.");return;}
    Alert.alert("Товар добавлен","Позиция сохранена в каталоге.",[{text:"Открыть каталог",onPress:()=>router.replace("/catalog" as never)}]);
  };
  return <SafeAreaView style={styles.page}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Link href={"/catalog" as never} style={styles.back}>← Каталог</Link><Text style={styles.kicker}>НОВАЯ ПОЗИЦИЯ</Text><Text style={styles.title}>Добавить товар</Text><Text style={styles.subtitle}>{tenantName??"Ваш магазин"} · обязательны только название, цена и остаток.</Text>
    <View style={styles.card}><Field label="Название *"><TextInput value={title} onChangeText={setTitle} maxLength={120} placeholder="Например, Круассан с сыром" placeholderTextColor="#87929A" style={styles.input}/></Field><Field label="Описание"><TextInput value={description} onChangeText={setDescription} maxLength={1200} multiline placeholder="Состав, вес, важные детали" placeholderTextColor="#87929A" style={[styles.input,styles.area]}/></Field>
      <View style={styles.row}><View style={{flex:1}}><Field label="Цена, ₸ *"><TextInput value={price} onChangeText={v=>setPrice(v.replace(/\D/g,""))} keyboardType="number-pad" placeholder="5000" placeholderTextColor="#87929A" style={styles.input}/></Field></View><View style={{flex:1}}><Field label="Старая цена, ₸"><TextInput value={oldPrice} onChangeText={v=>setOldPrice(v.replace(/\D/g,""))} keyboardType="number-pad" placeholder="Необязательно" placeholderTextColor="#87929A" style={styles.input}/></Field></View></View>
      <View style={styles.row}><View style={{flex:1}}><Field label="Остаток *"><TextInput value={stock} onChangeText={v=>setStock(v.replace(/\D/g,""))} keyboardType="number-pad" placeholder="1" placeholderTextColor="#87929A" style={styles.input}/></Field></View><View style={{flex:1}}><Field label="Артикул"><TextInput value={sku} onChangeText={setSku} autoCapitalize="characters" maxLength={80} placeholder="SKU-001" placeholderTextColor="#87929A" style={styles.input}/></Field></View></View>
      {categories.length>0&&<Field label="Категория"><View style={styles.chips}><Pressable onPress={()=>setCategoryId(null)} style={[styles.chip,categoryId===null&&styles.chipActive]}><Text style={[styles.chipText,categoryId===null&&styles.chipTextActive]}>Без категории</Text></Pressable>{categories.map(category=><Pressable key={category.id} onPress={()=>setCategoryId(category.id)} style={[styles.chip,categoryId===category.id&&styles.chipActive]}><Text style={[styles.chipText,categoryId===category.id&&styles.chipTextActive]}>{category.name}</Text></Pressable>)}</View></Field>}
      <View style={styles.note}><Text style={styles.noteTitle}>Можно дополнить позже</Text><Text style={styles.noteText}>Фото, КБЖУ, состав, добавки и комбо доступны в расширенном редакторе AI Studio. Основная позиция уже будет рабочей.</Text></View>
      <Pressable disabled={saving} onPress={()=>{void save();}} style={[styles.save,saving&&{opacity:.55}]}>{saving?<ActivityIndicator color="white"/>:<Text style={styles.saveText}>Сохранить товар</Text>}</Pressable>
    </View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <View style={{gap:8}}><Text style={styles.label}>{label}</Text>{children}</View>}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:colors.stone},content:{padding:22,paddingBottom:54,gap:12},back:{color:colors.navy,fontWeight:"800",marginBottom:8},kicker:{color:colors.navy,fontSize:11,fontWeight:"900",letterSpacing:1.4},title:{fontSize:34,fontWeight:"900",color:colors.ink,letterSpacing:-1},subtitle:{color:colors.muted,fontSize:14,lineHeight:21},card:{marginTop:8,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:22,padding:18,gap:18},label:{fontSize:13,fontWeight:"800",color:colors.ink},input:{minHeight:50,borderWidth:1,borderColor:"#C9D3DA",borderRadius:13,paddingHorizontal:14,color:colors.ink,fontSize:16,backgroundColor:"white"},area:{minHeight:96,paddingTop:14,textAlignVertical:"top"},row:{flexDirection:"row",gap:10},chips:{flexDirection:"row",flexWrap:"wrap",gap:8},chip:{borderWidth:1,borderColor:colors.line,borderRadius:999,paddingHorizontal:12,paddingVertical:9},chipActive:{backgroundColor:colors.navy,borderColor:colors.navy},chipText:{fontSize:12,fontWeight:"700",color:colors.ink},chipTextActive:{color:"white"},note:{borderRadius:14,backgroundColor:colors.navySoft,padding:14,gap:4},noteTitle:{color:colors.navyDark,fontWeight:"900"},noteText:{color:colors.muted,fontSize:12,lineHeight:18},save:{minHeight:52,borderRadius:14,backgroundColor:colors.navy,alignItems:"center",justifyContent:"center"},saveText:{color:"white",fontSize:15,fontWeight:"900"}});

