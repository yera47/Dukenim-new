import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Role = "customer" | "owner" | "superadmin";
const jade = "#071B17", gold = "#B08A50", stone = "#F4F0E8";

function Button({ label, onPress, muted = false }: { label: string; onPress: () => void; muted?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.button, muted && styles.buttonMuted]}><Text style={[styles.buttonText, muted && styles.buttonMutedText]}>{label}</Text></Pressable>;
}

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = supabase;
    if (!client) { setLoading(false); return; }
    const load = async () => {
      const { data: { user: current } } = await client.auth.getUser();
      setUser(current);
      if (current) {
        const { data } = await client.from("profiles").select("role").eq("id", current.id).maybeSingle();
        if (data?.role === "owner" || data?.role === "superadmin") setRole(data.role);
      }
      setLoading(false);
    };
    void load();
    const { data } = client.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) Alert.alert("Не удалось войти", error.message); else setPassword("");
  };
  const signOut = async () => { await supabase?.auth.signOut(); setUser(null); setRole("customer"); };

  if (loading) return <View style={styles.loader}><ActivityIndicator color={gold} /></View>;
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.brand}><View style={styles.mark}><Text style={styles.markText}>D</Text></View><Text style={styles.title}>Dukenim</Text></View>
    {!isSupabaseConfigured ? <View style={styles.card}><Text style={styles.cardTitle}>Нужна настройка среды</Text><Text style={styles.muted}>Добавьте публичный URL и publishable key Supabase в EXPO_PUBLIC_* переменные. Секреты и service-role ключи в приложение не попадают.</Text></View> : user ? <>
      <Text style={styles.eyebrow}>{role === "superadmin" ? "СУПЕРАДМИНИСТРАТОР" : role === "owner" ? "ВЛАДЕЛЕЦ" : "АККАУНТ"}</Text>
      <Text style={styles.welcome}>Здравствуйте</Text><Text style={styles.muted}>{user.email}</Text>
      <View style={styles.grid}><View style={styles.card}><Text style={styles.cardTitle}>Заказы</Text><Text style={styles.muted}>Рабочая лента в веб-кабинете</Text></View><Link href="/scanner" asChild><Pressable style={styles.card}><Text style={styles.cardTitle}>Сканер</Text><Text style={styles.muted}>Штрихкод камерой</Text></Pressable></Link></View>
      {role === "superadmin" && <View style={styles.adminCard}><Text style={styles.cardTitle}>Центр платформы</Text><Text style={styles.muted}>Ваш уровень доступа к Root сохранён. Мобильные root-операции будут включаться только с серверным аудитом.</Text></View>}
      <Link href="/settings" asChild><Pressable style={styles.secondary}><Text style={styles.secondaryText}>Уведомления и настройки</Text></Pressable></Link>
      <Button label="Выйти" onPress={signOut} muted />
    </> : <View style={styles.card}><Text style={styles.cardTitle}>Вход в рабочее приложение</Text><Text style={styles.muted}>Используйте тот же аккаунт Dukenim, что и в веб-кабинете.</Text><TextInput autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#69736D" style={styles.input} /><TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Пароль" placeholderTextColor="#69736D" style={styles.input} /><Button label="Войти" onPress={signIn} /><Text style={styles.help}>Google и Apple появятся в нативном входе после безопасной настройки мобильных OAuth-клиентов.</Text></View>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:stone}, content:{padding:24,gap:16}, loader:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:stone}, brand:{flexDirection:"row",alignItems:"center",gap:10,marginTop:8}, mark:{width:36,height:36,borderRadius:12,backgroundColor:jade,alignItems:"center",justifyContent:"center"},markText:{color:gold,fontSize:21,fontWeight:"800"},title:{fontSize:25,fontWeight:"800",color:jade},eyebrow:{color:"#7A6040",fontSize:11,fontWeight:"800",letterSpacing:1.4,marginTop:20},welcome:{fontSize:34,fontWeight:"800",color:jade,marginTop:4},muted:{fontSize:14,lineHeight:20,color:"#56625B"},card:{backgroundColor:"#FFFDF8",borderWidth:1,borderColor:"#E0D7C8",borderRadius:22,padding:20,gap:12,flex:1},adminCard:{backgroundColor:"#E8DFD0",borderRadius:22,padding:20,gap:8},cardTitle:{fontSize:18,fontWeight:"800",color:jade},grid:{flexDirection:"row",gap:12},button:{backgroundColor:jade,borderRadius:14,paddingVertical:15,alignItems:"center",marginTop:4},buttonText:{color:"#FFFDF8",fontWeight:"800",fontSize:15},buttonMuted:{backgroundColor:"transparent",borderWidth:1,borderColor:"#B9B1A4"},buttonMutedText:{color:jade},input:{backgroundColor:"#F7F2E9",borderRadius:12,borderWidth:1,borderColor:"#DDD2C1",padding:14,color:jade,fontSize:16},help:{color:"#69736D",fontSize:12,lineHeight:17},secondary:{padding:17,borderRadius:16,backgroundColor:"#E8DFD0"},secondaryText:{color:jade,fontWeight:"800",textAlign:"center"} });
