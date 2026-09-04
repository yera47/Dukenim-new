import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type PushSetup = { state: "granted" | "denied" | "unavailable"; message: string };

export async function requestPushPermission(): Promise<PushSetup> {
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return { state: "denied", message: "Разрешение не выдано. Его можно включить в настройках телефона." };
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("orders", { name: "Заказы Dukenim", importance: Notifications.AndroidImportance.HIGH });
  return { state: "granted", message: "Разрешение получено. Отправка включится после подключения защищённого push-канала Dukenim." };
}
