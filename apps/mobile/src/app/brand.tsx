import {useCallback,useEffect,useRef,useState} from "react";
import {ActivityIndicator,Alert,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {Image} from "expo-image";
import {router} from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {EditorScreen} from "@/components/editor-screen";
import {ui} from "@/components/app-shell";
import {useOwnerStore} from "@/lib/use-owner-store";
import {colors} from "@/lib/theme";
import {supabase} from "@/lib/supabase";

const templates=[
 {key:"gallery",title:"Галерея",copy:"Премиальная подача для ресторанов, брендов и больших каталогов."},
 {key:"journal",title:"Меню и истории",copy:"Донерные, выпечка, кофе с собой и быстрые заказы."},
] as const;
type Settings={template_key:string;hero_title:string|null;hero_subtitle:string|null;hero_cta_label:string|null;hero_image_url:string|null};
const empty:Settings={template_key:"gallery",hero_title:"",hero_subtitle:"",hero_cta_label:"Смотреть каталог",hero_image_url:""};
const validHeroUrl=(value:string)=>{if(!value)return true;if(value.length>2000)return false;try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&!url.port;}catch{return false;}};

export default function Brand(){
 const{store,loading:storeLoading}=useOwnerStore();
 const[form,setForm]=useState<Settings>(empty),[version,setVersion]=useState<string|null>(null);
 const[state,setState]=useState<"loading"|"ready"|"error"|"setup">("loading"),[saving,setSaving]=useState(false);
 const request=useRef(0);
 const load=useCallback(async()=>{
  const current=++request.current;
  setState("loading");setVersion(null);setForm(empty);
  if(!store||!supabase){setState(storeLoading?"loading":"setup");return;}
  try{
   const{data,error}=await supabase.from("tenant_storefront_settings")
    .select("template_key,hero_title,hero_subtitle,hero_cta_label,hero_image_url,updated_at")
    .eq("tenant_id",store.id).maybeSingle();
   if(current!==request.current)return;
   if(error){setState("error");return;}
   if(!data){setState("setup");return;}
   setForm({template_key:data.template_key??"gallery",hero_title:data.hero_title??"",hero_subtitle:data.hero_subtitle??"",hero_cta_label:data.hero_cta_label??"Смотреть каталог",hero_image_url:data.hero_image_url??""});
   setVersion(data.updated_at);setState("ready");
  }catch{if(current===request.current)setState("error");}
 },[store,storeLoading]);
 useEffect(()=>{void load();},[load]);

 const chooseHero=async()=>{
  const client=supabase;if(state!=="ready"||!store||!client||saving)return;
  const current=request.current;
  const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
  if(!permission.granted){Alert.alert("Нужен доступ к фото","Разрешите выбрать обложку магазина.");return;}
  const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,aspect:[16,9],quality:.9});
  if(picked.canceled)return;
  if(current!==request.current)return;
  const asset=picked.assets[0];
  const extension=asset.mimeType==="image/png"?"png":asset.mimeType==="image/webp"?"webp":asset.mimeType==="image/jpeg"?"jpg":null;
  if(!extension){Alert.alert("Формат не поддерживается","Выберите JPG, PNG или WebP.");return;}
  if((asset.fileSize??0)>10*1024*1024){Alert.alert("Фото слишком большое","Максимум 10 МБ.");return;}
  setSaving(true);
  try{
   const bytes=await(await fetch(asset.uri)).arrayBuffer();
   if(bytes.byteLength>10*1024*1024)throw new Error("Size limit");
   if(current!==request.current)return;
   const path=`${store.id}/hero-${Date.now()}.${extension}`;
   const uploaded=await client.storage.from("product-images").upload(path,bytes,{contentType:asset.mimeType??"image/jpeg",upsert:false});
   if(uploaded.error)throw uploaded.error;
   if(current===request.current)setForm(value=>({...value,hero_image_url:client.storage.from("product-images").getPublicUrl(path).data.publicUrl}));
  }catch{if(current===request.current)Alert.alert("Фото не загрузилось","Проверьте формат и размер до 10 МБ, затем повторите.");}
  finally{setSaving(false);}
 };

 const save=async()=>{
  if(state!=="ready"||!version||!store||!supabase||saving)return;
  const current=request.current;
  const image=form.hero_image_url?.trim()||"";
  if(!validHeroUrl(image)){Alert.alert("Проверьте ссылку","Фото должно открываться по защищённой HTTPS-ссылке.");return;}
  setSaving(true);
  try{
   const{data,error}=await supabase.from("tenant_storefront_settings").update({
    template_key:form.template_key,hero_title:form.hero_title?.trim()||null,
    hero_subtitle:form.hero_subtitle?.trim()||null,hero_cta_label:form.hero_cta_label?.trim()||"Смотреть каталог",
    hero_image_url:image||null,updated_at:new Date().toISOString(),
   }).eq("tenant_id",store.id).eq("updated_at",version).select("tenant_id,updated_at").maybeSingle();
   if(error)throw error;
   if(current!==request.current)return;
   if(!data){Alert.alert("Оформление изменилось","Настройки обновили в другом месте. Загрузите текущую версию и повторите.");void load();return;}
   setVersion(data.updated_at);
   Alert.alert("Оформление сохранено","Изменения уже используются витриной на сайте.");
  }catch{if(current===request.current)Alert.alert("Не удалось сохранить","Проверьте данные и повторите.");}
  finally{setSaving(false);}
 };

 return <EditorScreen title="Оформление" subtitle={store?.name}>
  {state==="loading"?<ActivityIndicator color={colors.navy}/>:state==="error"?<View style={ui.card}><Text style={ui.cardTitle}>Не удалось загрузить оформление</Text><Text style={ui.subtitle}>Сохранение заблокировано, чтобы не заменить текущий дизайн пустыми значениями.</Text><Pressable onPress={()=>void load()} style={ui.outline}><Text style={ui.outlineText}>Повторить</Text></Pressable></View>:state==="setup"?<View style={ui.card}><Text style={ui.cardTitle}>Начните сборку каталога</Text><Text style={ui.subtitle}>После создания основы магазина здесь появится оформление витрины.</Text><Pressable onPress={()=>router.push("/catalog-builder" as never)} style={ui.button}><Text style={ui.buttonText}>Открыть сборку</Text></Pressable></View>:<>
   <Text style={ui.title}>Внешний вид</Text>
   <Text style={ui.subtitle}>Те же настройки использует витрина на сайте. Выберите подачу и заполните тексты без технических терминов.</Text>
   <Text style={ui.cardTitle}>Шаблон</Text>
   {templates.map(item=><Pressable key={item.key} onPress={()=>setForm(current=>({...current,template_key:item.key}))} style={[s.template,form.template_key===item.key&&s.selected]}><View style={[s.preview,item.key==="journal"&&s.previewFast]}/><View style={{flex:1}}><Text style={s.templateTitle}>{item.title}</Text><Text style={ui.subtitle}>{item.copy}</Text></View><Text style={s.check}>{form.template_key===item.key?"✓":""}</Text></Pressable>)}
   <Pressable onPress={()=>router.push("/logo" as never)} style={s.logoLink}><Text style={s.logoLinkTitle}>Логотип магазина →</Text><Text style={ui.subtitle}>Загрузите свой знак для витрины</Text></Pressable>
   <View style={ui.card}><Text style={ui.label}>Фото обложки</Text><Pressable disabled={saving} onPress={()=>void chooseHero()} style={s.heroPicker}>{form.hero_image_url?<Image alt="Обложка магазина" source={{uri:form.hero_image_url}} contentFit="cover" style={s.heroImage}/>:<Text style={s.heroText}>＋ Выбрать фото из медиатеки</Text>}</Pressable><Text style={ui.label}>Заголовок обложки</Text><TextInput style={ui.input} value={form.hero_title??""} onChangeText={value=>setForm(current=>({...current,hero_title:value}))} placeholder={store?.name||"Название магазина"}/><Text style={ui.label}>Короткое описание</Text><TextInput style={ui.input} value={form.hero_subtitle??""} onChangeText={value=>setForm(current=>({...current,hero_subtitle:value}))} placeholder="Что вы предлагаете покупателю"/><Text style={ui.label}>Текст кнопки</Text><TextInput style={ui.input} value={form.hero_cta_label??""} onChangeText={value=>setForm(current=>({...current,hero_cta_label:value}))} maxLength={40}/><Text style={ui.label}>Или вставьте ссылку на фото</Text><TextInput autoCapitalize="none" keyboardType="url" style={ui.input} value={form.hero_image_url??""} onChangeText={value=>setForm(current=>({...current,hero_image_url:value}))} placeholder="https://..."/></View>
   <Pressable disabled={saving} onPress={()=>void save()} style={ui.button}><Text style={ui.buttonText}>{saving?"Сохраняем…":"Сохранить оформление"}</Text></Pressable>
  </>}
 </EditorScreen>;
}

const s=StyleSheet.create({template:{minHeight:116,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:13,backgroundColor:"white",flexDirection:"row",alignItems:"center",gap:13},selected:{borderColor:colors.navy,borderWidth:2},preview:{width:72,height:88,borderRadius:14,backgroundColor:colors.navyDark,borderWidth:8,borderColor:"#F3F6F8"},previewFast:{borderRadius:8,backgroundColor:colors.navy},templateTitle:{fontSize:17,fontWeight:"900",color:colors.ink,marginBottom:4},check:{fontSize:20,fontWeight:"900",color:colors.navy},logoLink:{borderWidth:1,borderColor:colors.line,borderRadius:16,padding:16,backgroundColor:"white",gap:3},logoLinkTitle:{fontSize:16,fontWeight:"900",color:colors.navyDark},heroPicker:{height:150,borderRadius:16,borderWidth:1,borderColor:colors.line,backgroundColor:colors.navySoft,overflow:"hidden",alignItems:"center",justifyContent:"center"},heroImage:{width:"100%",height:"100%"},heroText:{fontWeight:"900",color:colors.navy}});
