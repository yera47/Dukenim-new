import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export type PushSetup = { state: "granted" | "denied" | "unavailable"; message: string };

export async function requestPushPermission(): Promise<PushSetup> {
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return { state: "denied", message: "Разрешение не выдано. Его можно включить в настройках телефона." };
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("orders", { name: "Заказы Dukenim", importance: Notifications.AndroidImportance.HIGH });
  return { state: "granted", message: "Разрешение получено. Отправка включится после подключения защищённого push-канала Dukenim." };
}

export async function registerPushToken(): Promise<PushSetup> {
  if (Platform.OS === "web" || !Device.isDevice) return { state: "unavailable", message: "Push-токен создаётся только на физическом iPhone или Android-устройстве." };
  if (!supabase) return { state: "unavailable", message: "Supabase не настроен в приложении." };
  const permission = await requestPushPermission();
  if (permission.state !== "granted") return permission;
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return { state: "unavailable", message: "Нужно связать приложение с EAS перед регистрацией push-токена." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { state: "unavailable", message: "Сначала войдите в аккаунт Dukenim." };
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.from("mobile_device_tokens").upsert(
    { user_id: user.id, token, platform: Platform.OS, enabled: true, updated_at: new Date().toISOString() },
    { onConflict: "user_id,token" },
  );
  if (error) return { state: "unavailable", message: "Не удалось безопасно зарегистрировать устройство. Попробуйте ещё раз." };
  return { state: "granted", message: "Устройство зарегистрировано для уведомлений Dukenim." };
}
