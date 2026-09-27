import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOwnerStore } from "@/lib/use-owner-store";
import { site, colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

export default function StoreLogo() {
  const { store, loading } = useOwnerStore();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    if (!store || !supabase || busy) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if ((asset.fileSize ?? 0) > 3 * 1024 * 1024) { Alert.alert("Файл слишком большой", "Выберите PNG, JPEG или WebP до 3 МБ."); return; }
    setPreview(asset.uri);
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("tenantId", store.id);
      form.append("logo", { uri: asset.uri, name: asset.fileName ?? "logo.jpg", type: asset.mimeType ?? "image/jpeg" } as unknown as Blob);
      const response = await fetch(`${site}/api/mobile/logo`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token ?? ""}` }, body: form });
      const body = await response.json() as { logoUrl?: string; error?: string };
      if (!response.ok || !body.logoUrl) throw new Error(body.error ?? "Логотип не сохранился.");
      Alert.alert("Логотип обновлён", "Он уже используется на витрине сайта и в приложении.", [{ text: "Готово", onPress: () => router.back() }]);
    } catch (error) { Alert.alert("Не удалось обновить логотип", error instanceof Error ? error.message : "Повторите загрузку."); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={s.page}><View style={s.header}><Pressable accessibilityLabel="Назад" onPress={() => router.back()} style={s.back}><Text style={s.arrow}>‹</Text></Pressable><Text style={s.heading}>Логотип магазина</Text></View><Text style={s.title}>Ваш знак на витрине</Text><Text style={s.copy}>Выберите готовый логотип. Dukenim сохранит его пропорции и подготовит безопасный PNG для сайта. AI Studio использует сведения о бренде для текстов и оформления, но не перерисовывает ваш знак без вашего согласия.</Text><View style={s.preview}>{preview ? <Image alt="Выбранный логотип" source={{ uri: preview }} contentFit="contain" style={s.image} /> : <Text style={s.placeholder}>Логотип пока не выбран</Text>}</View><Pressable disabled={busy || loading || !store} onPress={() => void choose()} style={[s.button, (busy || loading || !store) && { opacity: .5 }]}>{busy ? <ActivityIndicator color="white" /> : <Text style={s.buttonText}>Выбрать и сохранить логотип</Text>}</Pressable><Text style={s.note}>PNG, JPEG или WebP до 3 МБ. Сохранение сразу обновит витрину магазина.</Text></SafeAreaView>;
}

const s = StyleSheet.create({ page: { flex: 1, backgroundColor: "white", padding: 22, gap: 16 }, header: { flexDirection: "row", alignItems: "center", gap: 15 }, back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.navySoft, alignItems: "center", justifyContent: "center" }, arrow: { fontSize: 31, lineHeight: 34, color: colors.navyDark }, heading: { fontSize: 15, fontWeight: "900", color: colors.ink }, title: { fontSize: 31, fontWeight: "900", color: colors.ink }, copy: { fontSize: 14, lineHeight: 21, color: colors.muted }, preview: { height: 190, borderRadius: 20, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F9FA" }, image: { width: "80%", height: "80%" }, placeholder: { color: colors.muted, fontWeight: "700" }, button: { minHeight: 54, backgroundColor: colors.navy, borderRadius: 15, alignItems: "center", justifyContent: "center" }, buttonText: { color: "white", fontWeight: "900", fontSize: 15 }, note: { color: colors.muted, fontSize: 12, lineHeight: 18 } });
