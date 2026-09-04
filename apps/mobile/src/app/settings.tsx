import { useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { requestPushPermission } from "@/lib/notifications";

export default function Settings() {
  const [status, setStatus] = useState("Уведомления ещё не запрашивались.");
  const enable = async () => setStatus((await requestPushPermission()).message);
  return <View style={styles.page}><Text style={styles.title}>Уведомления</Text><View style={styles.card}><Text style={styles.heading}>Заказы и остатки</Text><Text style={styles.text}>{status}</Text><Pressable onPress={enable} style={styles.button}><Text style={styles.buttonText}>Разрешить уведомления</Text></Pressable></View><View style={styles.card}><Text style={styles.heading}>Виджеты</Text><Text style={styles.text}>Виджеты iOS будут показывать только агрегированные данные. Доступ к заказам и клиентам в виджете не хранится.</Text></View><Link href="/" style={styles.link}>Готово</Link></View>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:"#F4F0E8",padding:28,gap:16,justifyContent:"center"},title:{fontSize:30,fontWeight:"800",color:"#071B17"},card:{backgroundColor:"#FFFDF8",borderRadius:22,padding:20,gap:10,borderWidth:1,borderColor:"#E0D7C8"},heading:{fontSize:18,fontWeight:"800",color:"#071B17"},text:{color:"#56625B",lineHeight:20},button:{backgroundColor:"#071B17",padding:15,borderRadius:14,marginTop:4,alignItems:"center"},buttonText:{color:"#FFFDF8",fontWeight:"800"},link:{textAlign:"center",color:"#071B17",fontWeight:"800",padding:12}});
