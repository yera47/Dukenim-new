import { useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";
import { workspaceRoute } from "@/lib/owner";
import { appleAuthReady, signInWithApple, signInWithGoogle } from "@/lib/social-auth";
import logoMark from "../../assets/images/logo-mark-compact.png";

export default function RegisterScreen() {
  const [business, setBusiness] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);

  async function social(provider: "google" | "apple") {
    if (!accepted) {
      Alert.alert("Подтвердите согласие", "Для создания аккаунта примите оферту и политику конфиденциальности.");
      return;
    }
    setPending(true);
    if (business.trim()) localStorage.setItem("dukenim_pending_business", business.trim());
    try {
      const success = await (provider === "google" ? signInWithGoogle() : signInWithApple());
      if (success) router.replace(await workspaceRoute() as never);
    } catch (error) {
      Alert.alert("Регистрация не завершена", error instanceof Error ? error.message : "Повторите попытку.");
    } finally {
      setPending(false);
    }
  }

  return <SafeAreaView style={s.page}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
    <Pressable accessibilityLabel="Назад" onPress={() => router.back()} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
    <View style={s.brand}><View style={s.mark}><Image source={logoMark} alt="Dukenim" resizeMode="contain" style={s.logo} /></View><Text style={s.brandName}>Dukenim</Text></View>
    <Text style={s.kicker}>НОВЫЙ МАГАЗИН</Text>
    <Text style={s.title}>Начните с вашего аккаунта</Text>
    <Text style={s.copy}>Войдите через Google. Потом выберите направление, оформление и добавьте первый товар. Начатый на сайте магазин откроется на том же шаге.</Text>
    <View style={s.card}>
      <Text style={s.label}>Название магазина можно указать сейчас или позже</Text>
      <TextInput value={business} onChangeText={setBusiness} maxLength={80} style={s.input} placeholder="Например, Моя пекарня" />
      <Pressable onPress={() => setAccepted(value => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} style={s.accept}><View style={[s.box, accepted && s.boxActive]}><Text style={s.check}>{accepted ? "✓" : ""}</Text></View><Text style={s.acceptText}>Принимаю оферту и политику конфиденциальности Dukenim</Text></Pressable>
      <Pressable disabled={pending} onPress={() => void social("google")} style={[s.button, pending && s.pending]}>{pending ? <ActivityIndicator color="white" /> : <Text style={s.buttonText}>Продолжить с Google</Text>}</Pressable>
      {Platform.OS === "ios" && appleAuthReady ? <Pressable disabled={pending} onPress={() => void social("apple")} style={s.secondary}><Text style={s.secondaryText}>Продолжить с Apple</Text></Pressable> : null}
    </View>
    <Text style={s.note}>Регистрация по email временно недоступна: доставка писем ещё настраивается. Если аккаунт уже создан, войдите по паролю.</Text>
    <Pressable onPress={() => router.replace("/")}><Text style={s.signIn}>Уже есть аккаунт? Войти →</Text></Pressable>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const s = StyleSheet.create({page:{flex:1,backgroundColor:"white"},content:{padding:24,paddingBottom:48,gap:16},back:{width:40,height:40,borderRadius:20,backgroundColor:colors.navySoft,alignItems:"center",justifyContent:"center"},backText:{fontSize:31,lineHeight:34,color:colors.navyDark},brand:{flexDirection:"row",alignItems:"center",gap:11,marginTop:6},mark:{width:46,height:46,borderRadius:14,borderWidth:1,borderColor:colors.line,alignItems:"center",justifyContent:"center"},logo:{width:29,height:31},brandName:{fontSize:25,fontWeight:"900",color:colors.ink},kicker:{color:colors.navy,fontSize:11,fontWeight:"900",letterSpacing:1.3,marginTop:13},title:{fontSize:34,fontWeight:"900",letterSpacing:-1.1,color:colors.ink,lineHeight:40},copy:{fontSize:15,lineHeight:23,color:colors.muted},card:{marginTop:6,borderWidth:1,borderColor:colors.line,borderRadius:22,padding:18,gap:15},label:{fontSize:13,fontWeight:"800",color:colors.ink},input:{minHeight:54,borderWidth:1,borderColor:colors.line,borderRadius:14,paddingHorizontal:14,fontSize:16,color:colors.ink},accept:{flexDirection:"row",alignItems:"center",gap:10},box:{width:24,height:24,borderRadius:7,borderWidth:1,borderColor:colors.line,alignItems:"center",justifyContent:"center"},boxActive:{backgroundColor:colors.navy,borderColor:colors.navy},check:{color:"white",fontWeight:"900"},acceptText:{flex:1,color:colors.muted,fontSize:12,lineHeight:18},button:{minHeight:54,borderRadius:14,backgroundColor:colors.navy,alignItems:"center",justifyContent:"center"},buttonText:{color:"white",fontSize:16,fontWeight:"900"},pending:{opacity:.6},secondary:{minHeight:50,borderWidth:1,borderColor:colors.line,borderRadius:14,alignItems:"center",justifyContent:"center"},secondaryText:{fontSize:15,fontWeight:"900",color:colors.ink},note:{fontSize:12,lineHeight:18,color:colors.muted},signIn:{fontSize:15,fontWeight:"900",color:colors.navyDark,textAlign:"center"}});
