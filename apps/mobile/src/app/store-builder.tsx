import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { EditorScreen } from "@/components/editor-screen";
import { ui } from "@/components/app-shell";
import { useOwnerStore } from "@/lib/use-owner-store";
import { colors } from "@/lib/theme";

const steps = [
  { title: "Товары и разделы", copy: "Фото, цена, варианты, остатки и категории", path: "/catalog" },
  { title: "Оформление витрины", copy: "Шаблон, цвета, обложка и тексты", path: "/brand" },
  { title: "Получение и оплата", copy: "Kaspi, самовывоз, Яндекс и ссылки на карты", path: "/delivery" },
  { title: "Истории", copy: "Фото и видео над каталогом", path: "/stories" },
  { title: "Акции", copy: "Баннеры и предложения покупателям", path: "/campaigns" },
  { title: "Лояльность", copy: "Подарки, скидки и правила программы", path: "/loyalty" },
] as const;

export default function StoreBuilder() {
  const { store } = useOwnerStore();
  return <EditorScreen title="Сборка магазина" subtitle={store?.name}>
    <Text style={ui.title}>Конструктор витрины</Text>
    <Text style={ui.subtitle}>Соберите магазин по понятным блокам. Изменения сохраняются в общей базе и сразу доступны в веб-кабинете.</Text>
    <View style={s.preview}>
      <View style={s.previewTop}/><View style={s.previewTitle}/><View style={s.previewGrid}><View style={s.previewCard}/><View style={s.previewCard}/><View style={s.previewCard}/></View>
      <Text style={s.previewLabel}>Предпросмотр структуры магазина</Text>
    </View>
    <View style={s.list}>{steps.map((item,index)=><Pressable key={item.path} onPress={()=>router.push(item.path as never)} style={({pressed})=>[s.row,pressed&&ui.pressed]}>
      <Text style={s.number}>{index+1}</Text><View style={{flex:1}}><Text style={s.title}>{item.title}</Text><Text style={s.copy}>{item.copy}</Text></View><Text style={s.arrow}>›</Text>
    </Pressable>)}</View>
    <Pressable onPress={()=>router.push("/preview" as never)} style={ui.button}><Text style={ui.buttonText}>Открыть витрину покупателя</Text></Pressable>
  </EditorScreen>;
}

const s=StyleSheet.create({preview:{height:190,borderRadius:24,backgroundColor:colors.navyDark,padding:18,gap:10,overflow:"hidden"},previewTop:{height:18,width:"38%",borderRadius:9,backgroundColor:"#FFFFFFB8"},previewTitle:{height:34,width:"72%",borderRadius:10,backgroundColor:"white"},previewGrid:{flex:1,flexDirection:"row",gap:9},previewCard:{flex:1,borderRadius:9,backgroundColor:"#FFFFFFD9"},previewLabel:{fontSize:11,fontWeight:"800",color:"#FFFFFFB8"},list:{borderWidth:1,borderColor:colors.line,borderRadius:22,backgroundColor:"white",overflow:"hidden"},row:{minHeight:82,padding:14,flexDirection:"row",alignItems:"center",gap:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},number:{width:34,height:34,borderRadius:17,backgroundColor:colors.navySoft,textAlign:"center",lineHeight:34,fontWeight:"900",color:colors.navy},title:{fontSize:16,fontWeight:"900",color:colors.ink},copy:{fontSize:12,lineHeight:17,color:colors.muted,marginTop:3},arrow:{fontSize:30,color:colors.navy}});
