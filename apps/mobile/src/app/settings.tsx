import { useCallback, useRef, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { router, useFocusEffect } from "expo-router";
import { AppScreen, ui } from "@/components/app-shell";
import { useOwnerStore } from "@/lib/use-owner-store";
import { currentDevicePushStatus, registerPushToken } from "@/lib/notifications";
import { site } from "@/lib/theme";
import { changeStoreArchive } from "@/lib/store-archive";
import { storeArchiveEnabled } from "@/lib/store-archive-feature";

export default function Settings() {
  const { store } = useOwnerStore();
  const [status, setStatus] = useState("Проверяем регистрацию телефона…");
  const [registered, setRegistered] = useState(false);
  const [pending, setPending] = useState(false);
  const [archivePending, setArchivePending] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const checkId = useRef(0);

  useFocusEffect(useCallback(() => {
    const id = ++checkId.current;
    setStatus("Проверяем регистрацию телефона…");
    void currentDevicePushStatus().then(result => {
      if (id !== checkId.current) return;
      setStatus(result.message);
      setRegistered(result.state === "granted");
    }).catch(() => {
      if (id !== checkId.current) return;
      setStatus("Не удалось проверить уведомления. Проверьте интернет и настройки.");
      setRegistered(false);
    });
    return () => { checkId.current++; };
  }, []));

  const enable = async () => {
    if (pending) return;
    checkId.current++;
    setPending(true);
    try {
      const result = await registerPushToken();
      setStatus(result.state === "granted" ? "Телефон зарегистрирован. Доставку push нужно проверить отдельно." : result.message);
      setRegistered(result.state === "granted");
    } catch {
      setStatus("Не удалось включить уведомления. Проверьте интернет.");
      setRegistered(false);
    } finally { setPending(false); }
  };

  const archive = async () => {
    if (!store || archivePending) return;
    if (confirmation.trim() !== store.slug || reason.trim().length < 3) {
      Alert.alert("Проверьте подтверждение", "Введите точный адрес магазина и причину не короче 3 символов.");
      return;
    }
    setArchivePending(true);
    try {
      await changeStoreArchive({ action: "archive", tenantId: store.id, slug: store.slug, reason: reason.trim() });
      localStorage.removeItem("dukenim_selected_store");
      Alert.alert("Магазин в архиве", "Аккаунт и данные сохранены. Магазин можно восстановить на следующем экране.", [
        { text: "Продолжить", onPress: () => router.replace("/setup-store" as never) },
      ]);
    } catch (cause) {
      Alert.alert("Не удалось архивировать", cause instanceof Error ? cause.message : "Попробуйте ещё раз.");
    } finally { setArchivePending(false); }
  };

  return <AppScreen section="Настройки" store={store?.name}>
    <Text style={ui.title}>Приложение</Text>
    <Text style={ui.subtitle}>Настройки относятся к этому устройству. Данные магазина синхронизируются автоматически.</Text>
    <Text style={[ui.cardTitle, { marginTop: 5 }]}>Уведомления о заказах</Text>
    <Text style={ui.subtitle}>{status}</Text>
    <Pressable disabled={pending} onPress={() => void enable()} style={ui.button}>
      <Text style={ui.buttonText}>{pending ? "Подключаем…" : registered ? "Обновить регистрацию" : "Включить уведомления"}</Text>
    </Pressable>
    <Text style={[ui.cardTitle, { marginTop: 8 }]}>Документы и помощь</Text>
    <Pressable onPress={() => void Linking.openURL(`${site}/legal/privacy`)} style={ui.outline}><Text style={ui.outlineText}>Политика конфиденциальности →</Text></Pressable>
    <Pressable onPress={() => void Linking.openURL(`${site}/legal/offer`)} style={ui.outline}><Text style={ui.outlineText}>Публичная оферта →</Text></Pressable>
    <Pressable onPress={() => void Linking.openURL(`${site}/support`)} style={ui.outline}><Text style={ui.outlineText}>Поддержка Dukenim →</Text></Pressable>
    {storeArchiveEnabled && store ? <View style={s.archiveCard}>
      <Text style={s.archiveTitle}>Архив магазина</Text>
      <Text style={s.archiveCopy}>Витрина станет недоступна, но аккаунт, товары, заказы и настройки сохранятся. Архивация не отменяет платную подписку.</Text>
      <Text style={s.label}>Введите {store.slug}</Text>
      <TextInput value={confirmation} onChangeText={setConfirmation} autoCapitalize="none" autoCorrect={false} style={s.input} />
      <Text style={s.label}>Причина</Text>
      <TextInput value={reason} onChangeText={setReason} multiline maxLength={1000} style={[s.input, s.reason]} />
      <Pressable disabled={archivePending} onPress={() => void archive()} style={s.archiveButton}><Text style={s.archiveButtonText}>{archivePending ? "Сохраняем…" : "Переместить в архив"}</Text></Pressable>
    </View> : null}
  </AppScreen>;
}

const s = StyleSheet.create({
  archiveCard: { gap: 10, borderRadius: 20, borderWidth: 1, borderColor: "#E8D7B7", backgroundColor: "#FFF9EE", padding: 16 },
  archiveTitle: { fontSize: 17, fontWeight: "900", color: "#5C3A12" },
  archiveCopy: { fontSize: 12, lineHeight: 18, color: "#705A3D" },
  label: { fontSize: 12, fontWeight: "800", color: "#3D2E1C" },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#DDC69E", borderRadius: 13, backgroundColor: "white", paddingHorizontal: 12, fontSize: 14 },
  reason: { minHeight: 82, paddingTop: 12, textAlignVertical: "top" },
  archiveButton: { minHeight: 48, borderRadius: 13, backgroundColor: "#6F4517", alignItems: "center", justifyContent: "center" },
  archiveButtonText: { color: "white", fontWeight: "900" },
});
