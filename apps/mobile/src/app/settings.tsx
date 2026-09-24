import { useState } from "react";
import { Link } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { registerPushToken } from "@/lib/notifications";

const site = "https://www.dukenim.kz";

export default function Settings() {
  const [status, setStatus] = useState("Уведомления ещё не запрашивались.");
  const [pending, setPending] = useState(false);
  const enable = async () => {
    if (pending) return;
    setPending(true);
    try { setStatus((await registerPushToken()).message); }
    catch { setStatus("Не удалось подключить уведомления. Проверьте интернет и попробуйте ещё раз."); }
    finally { setPending(false); }
  };
  const open = (path: string) => { void Linking.openURL(`${site}${path}`); };
  return <View style={styles.page}><Text style={styles.title}>Настройки</Text><View style={styles.card}><Text style={styles.heading}>Уведомления о заказах</Text><Text style={styles.text}>{status}</Text><Pressable disabled={pending} onPress={enable} style={[styles.button,pending&&styles.disabled]}><Text style={styles.buttonText}>{pending?"Подключаем…":"Подключить уведомления"}</Text></Pressable></View><View style={styles.card}><Text style={styles.heading}>Кабинет Dukenim</Text><Text style={styles.text}>Каталог, сотрудники, доставка, оплата и поддержка доступны в полном веб-кабинете.</Text><Pressable onPress={()=>open("/admin")} style={styles.outline}><Text style={styles.outlineText}>Открыть кабинет ↗</Text></Pressable></View><View style={styles.legal}><Pressable onPress={()=>open("/legal/privacy")}><Text style={styles.legalLink}>Конфиденциальность ↗</Text></Pressable><Pressable onPress={()=>open("/legal/offer")}><Text style={styles.legalLink}>Условия использования ↗</Text></Pressable><Pressable onPress={()=>open("/support")}><Text style={styles.legalLink}>Поддержка ↗</Text></Pressable></View><Link href="/" style={styles.link}>Готово</Link></View>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:"#FFFFFF",padding:28,gap:16,justifyContent:"center"},title:{fontSize:30,fontWeight:"800",color:"#071B17"},card:{backgroundColor:"#FFFFFF",borderRadius:22,padding:20,gap:10,borderWidth:1,borderColor:"#D8E0E6"},heading:{fontSize:18,fontWeight:"800",color:"#071B17"},text:{color:"#56625B",lineHeight:20},button:{backgroundColor:"#071B17",padding:15,borderRadius:14,marginTop:4,alignItems:"center"},disabled:{opacity:.55},buttonText:{color:"#FFFFFF",fontWeight:"800"},outline:{borderWidth:1,borderColor:"#AEBBC4",padding:14,borderRadius:14,alignItems:"center"},outlineText:{color:"#071B17",fontWeight:"800"},legal:{flexDirection:"row",flexWrap:"wrap",justifyContent:"center",gap:14},legalLink:{color:"#0E3854",fontSize:12,fontWeight:"700",textDecorationLine:"underline"},link:{textAlign:"center",color:"#071B17",fontWeight:"800",padding:12}});
