import {useCallback, useRef, useState} from "react";
import {Linking, Pressable, Text} from "react-native";
import {useFocusEffect} from "expo-router";
import {AppScreen, ui} from "@/components/app-shell";
import {useOwnerStore} from "@/lib/use-owner-store";
import {currentDevicePushStatus, registerPushToken} from "@/lib/notifications";
import {site} from "@/lib/theme";

export default function Settings() {
  const {store} = useOwnerStore();
  const [status, setStatus] = useState("Проверяем регистрацию телефона…");
  const [registered, setRegistered] = useState(false);
  const [pending, setPending] = useState(false);
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
      setStatus("Не удалось проверить уведомления. Проверьте интернет и повторите.");
      setRegistered(false);
    });
    const sequence = checkId;
    return () => { sequence.current++; };
  }, []));
  const enable = async () => {
    if (pending) return;
    checkId.current++;
    setPending(true);
    try {
      const result = await registerPushToken();
      setStatus(result.state === "granted"
        ? "Телефон зарегистрирован. Доставку нового заказа нужно проверить отдельно."
        : result.message);
      setRegistered(result.state === "granted");
    } catch {
      setStatus("Не удалось подключить уведомления. Проверьте интернет.");
      setRegistered(false);
    } finally {
      setPending(false);
    }
  };
  return <AppScreen section="Настройки" store={store?.name}>
    <Text style={ui.title}>Приложение</Text>
    <Text style={ui.subtitle}>Настройки относятся к этому устройству. Данные магазина синхронизируются автоматически.</Text>
    <Text style={[ui.cardTitle, {marginTop: 5}]}>Уведомления о заказах</Text>
    <Text style={ui.subtitle}>{status}</Text>
    <Pressable disabled={pending} onPress={() => void enable()} style={ui.button}>
      <Text style={ui.buttonText}>{pending ? "Подключаем…" : registered ? "Обновить регистрацию" : "Подключить уведомления"}</Text>
    </Pressable>
    <Text style={[ui.cardTitle, {marginTop: 8}]}>Документы и помощь</Text>
    <Pressable onPress={() => void Linking.openURL(`${site}/legal/privacy`)} style={ui.outline}><Text style={ui.outlineText}>Политика конфиденциальности ↗</Text></Pressable>
    <Pressable onPress={() => void Linking.openURL(`${site}/legal/offer`)} style={ui.outline}><Text style={ui.outlineText}>Публичная оферта ↗</Text></Pressable>
    <Pressable onPress={() => void Linking.openURL(`${site}/support`)} style={ui.outline}><Text style={ui.outlineText}>Поддержка Dukenim ↗</Text></Pressable>
  </AppScreen>;
}
