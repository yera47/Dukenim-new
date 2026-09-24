import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { EditorScreen } from "@/components/editor-screen";
import { ui } from "@/components/app-shell";
import { useOwnerStore } from "@/lib/use-owner-store";
import { colors } from "@/lib/theme";

const features=["Каталог, корзина и заказы","AI Studio и оформление витрины","Товары, остатки, клиенты и аналитика","Акции, истории и программа лояльности","Сотрудники, доставка, Kaspi и интеграции","Постоянная ссылка магазина"];

export default function Plan(){const{store}=useOwnerStore();return <EditorScreen title="Тариф" subtitle={store?.name}>
  <Text style={ui.title}>Один тариф. Все функции.</Text><Text style={ui.subtitle}>Ничего не нужно сравнивать: весь кабинет Dukenim доступен в тарифе «Каталог».</Text>
  <View style={s.hero}><Text style={s.eyebrow}>КАТАЛОГ</Text><Text style={s.price}>24 900 ₸</Text><Text style={s.period}>в месяц · первые 7 дней бесплатно</Text></View>
  <View style={ui.card}>{features.map(item=><View key={item} style={s.feature}><Text style={s.check}>✓</Text><Text style={s.featureText}>{item}</Text></View>)}</View>
  <Text style={ui.subtitle}>Оплата не списывается без вашего подтверждения. Настройка внешнего поставщика может требовать отдельный договор с ним.</Text>
  <Pressable onPress={()=>router.push("/support" as never)} style={ui.button}><Text style={ui.buttonText}>Задать вопрос по оплате</Text></Pressable>
  </EditorScreen>}
const s=StyleSheet.create({hero:{borderRadius:26,backgroundColor:colors.navyDark,padding:24,gap:6},eyebrow:{fontSize:11,fontWeight:"900",letterSpacing:1.4,color:"#BBD5E2"},price:{fontSize:38,fontWeight:"900",color:"white",letterSpacing:-1},period:{fontSize:13,color:"#FFFFFFB8"},feature:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:7},check:{width:24,height:24,borderRadius:12,backgroundColor:colors.navySoft,textAlign:"center",lineHeight:24,fontWeight:"900",color:colors.navy},featureText:{flex:1,fontSize:14,lineHeight:20,fontWeight:"700",color:colors.ink}});
