import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, site } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

export default function StaffProductNew() {
  const { accessId } = useLocalSearchParams<{ accessId?: string }>();
  const requestId = useRef(randomUUID());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [canStock, setCanStock] = useState(false);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accessReady, setAccessReady] = useState(false);

  const checkAccess = useCallback(async () => {
    if (!supabase || !accessId) throw new Error("Откройте каталог из кабинета сотрудника.");
    const membership = await supabase.from("staff_access").select("id,permissions,active").eq("id", accessId).eq("active", true).maybeSingle();
    if (membership.error || !membership.data || (membership.data.permissions as Record<string, string> | null)?.catalog !== "write") throw new Error("Владелец не разрешил добавлять товары.");
    const stockAllowed = (membership.data.permissions as Record<string, string>)?.stock === "write";
    setCanStock(stockAllowed);
    setAccessReady(true);
    setError("");
    return stockAllowed;
  }, [accessId]);
  useEffect(() => { void checkAccess().catch(cause => setError(cause instanceof Error ? cause.message : "Доступ недоступен.")); }, [checkAccess]);

  const choose = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: Math.max(1, 4 - photos.length), quality: .85 });
    if (picked.canceled) return;
    const next = [...photos, ...picked.assets].slice(0, 4);
    if (next.reduce((total, photo) => total + (photo.fileSize ?? 0), 0) > 3_000_000) {
      Alert.alert("Фото слишком большие", "Выберите до 4 фотографий JPG, PNG или WebP суммарно до 3 МБ."); return;
    }
    setPhotos(next);
  };
  const save = async () => {
    if (busy) return;
    const amount = Number(price), quantity = Number(stock);
    if (!/^[0-9]{1,10}$/.test(price) || !Number.isSafeInteger(amount) || amount > 2_000_000_000 || title.trim().length < 2 || description.length > 4000) { setError("Проверьте название, описание и цену в тенге."); return; }
    if (!/^[0-9]{1,7}$/.test(stock) || !Number.isSafeInteger(quantity) || quantity > 1_000_000) { setError("Остаток должен быть целым числом до 1 000 000."); return; }
    setBusy(true); setError("");
    try {
      const stockAllowed = await checkAccess();
      if (quantity > 0 && !stockAllowed) throw new Error("Начальный остаток может указать только сотрудник с доступом к складу.");
      const { data: { session }, error: sessionError } = await supabase!.auth.getSession();
      if (sessionError || !session) throw new Error("Сессия истекла. Войдите снова.");
      const form = new FormData();
      form.append("access", accessId!); form.append("request", requestId.current);
      form.append("title", title.trim()); form.append("description", description.trim());
      form.append("price", price); form.append("stock", stock);
      for (const [index, photo] of photos.entries()) form.append("images", { uri: photo.uri, name: photo.fileName ?? `product-${index}.jpg`, type: photo.mimeType ?? "image/jpeg" } as unknown as Blob);
      const response = await fetch(`${site}/api/mobile/staff-products`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: form });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error ?? "Товар не сохранён.");
      Alert.alert("Товар добавлен", "Карточка сохранена скрытой. Проверьте её и включите показ покупателям.", [{ text: "В каталог", onPress: () => router.back() }]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить. Обновите каталог и повторите."); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={s.page}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.back()} style={s.back}><Text style={s.arrow}>‹</Text></Pressable><Text style={s.headerTitle}>Каталог · новая позиция</Text><View style={{ width: 42 }} /></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <Text style={s.title}>Добавить товар</Text><Text style={s.copy}>Название, цена и фотографии сохраняются в том же магазине, что и на сайте. Новая карточка сначала скрыта от покупателей.</Text>
      {error ? <View style={s.errorCard}><Text style={s.error}>{error}</Text>{!accessReady ? <Pressable onPress={() => void checkAccess().catch(cause => setError(cause instanceof Error ? cause.message : "Доступ недоступен."))}><Text style={s.retry}>Повторить проверку</Text></Pressable> : null}</View> : null}
      <View style={s.card}><Text style={s.label}>Фотографии · до 4</Text><Pressable onPress={() => void choose()} style={s.photoButton}><Text style={s.photoButtonText}>＋ {photos.length ? `Добавить ещё · ${photos.length}/4` : "Выбрать из медиатеки"}</Text></Pressable>
        {photos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>{photos.map((photo, index) => <Pressable key={`${photo.uri}-${index}`} onPress={() => setPhotos(current => current.filter((_, i) => i !== index))}><Image source={{ uri: photo.uri }} alt="Фото товара" contentFit="cover" style={s.photo} /><Text style={s.remove}>Убрать</Text></Pressable>)}</ScrollView> : null}
        <Text style={s.hint}>JPG, PNG или WebP, суммарно до 3 МБ.</Text>
        <Text style={s.label}>Название *</Text><TextInput value={title} onChangeText={setTitle} maxLength={200} placeholder="Например, Круассан с сыром" placeholderTextColor={colors.muted} style={s.input} />
        <Text style={s.label}>Описание</Text><TextInput value={description} onChangeText={setDescription} maxLength={4000} multiline placeholder="Состав и важные детали" placeholderTextColor={colors.muted} style={[s.input, s.area]} />
        <Text style={s.label}>Цена, ₸ *</Text><TextInput value={price} onChangeText={value => setPrice(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="5000" placeholderTextColor={colors.muted} style={s.input} />
        {canStock ? <><Text style={s.label}>Начальный остаток</Text><TextInput value={stock} onChangeText={value => setStock(value.replace(/\D/g, ""))} keyboardType="number-pad" style={s.input} /></> : <Text style={s.hint}>Остаток заполнит владелец или сотрудник с доступом к складу.</Text>}
      </View>
    </ScrollView><View style={s.footer}><Pressable accessibilityRole="button" disabled={busy || !accessReady} onPress={() => void save()} style={[s.save, (busy || !accessReady) && { opacity: .5 }]}>{busy ? <ActivityIndicator color="white" /> : <Text style={s.saveText}>Сохранить товар</Text>}</Pressable></View>
  </KeyboardAvoidingView></SafeAreaView>;
}

const s = StyleSheet.create({ page: { flex: 1, backgroundColor: "white" }, header: { height: 60, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navySoft, alignItems: "center", justifyContent: "center" }, arrow: { fontSize: 31, lineHeight: 34, color: colors.navyDark }, headerTitle: { fontSize: 15, fontWeight: "900", color: colors.ink }, content: { padding: 20, paddingBottom: 40, gap: 13 }, title: { fontSize: 31, fontWeight: "900", color: colors.ink }, copy: { fontSize: 14, lineHeight: 21, color: colors.muted }, card: { gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 17 }, label: { fontSize: 13, fontWeight: "800", color: colors.ink, marginTop: 5 }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, color: colors.ink, fontSize: 15 }, area: { minHeight: 96, textAlignVertical: "top" }, photoButton: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.navySoft }, photoButtonText: { color: colors.navyDark, fontWeight: "900" }, photo: { width: 88, height: 88, borderRadius: 12 }, remove: { color: colors.danger, fontSize: 11, textAlign: "center", marginTop: 4 }, hint: { fontSize: 12, lineHeight: 18, color: colors.muted }, footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line }, save: { height: 52, borderRadius: 14, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }, saveText: { color: "white", fontWeight: "900", fontSize: 15 }, errorCard: { borderRadius: 14, backgroundColor: "#FFF4F2", padding: 13, gap: 8 }, error: { color: colors.danger, fontSize: 13, lineHeight: 19 }, retry: { color: colors.navyDark, fontWeight: "900" } });
