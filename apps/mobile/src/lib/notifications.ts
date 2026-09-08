import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export type PushSetup = { state: "granted" | "denied" | "unavailable"; message: string };

export async function requestPushPermission(): Promise<PushSetup> {
  if (Platform.OS === "web" || !Device.isDevice) return { state: "unavailable", message: "Откройте установленное приложение на телефоне." };
  // Android 13 needs a channel before requesting notification permission.
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("orders", { name: "Заказы Dukenim", importance: Notifications.AndroidImportance.HIGH });
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return { state: "denied", message: "Разрешение не выдано. Его можно включить в настройках телефона." };
  return { state: "granted", message: "Разрешение получено." };
}

export async function registerPushToken(): Promise<PushSetup> {
  if (Platform.OS === "web" || !Device.isDevice) return { state: "unavailable", message: "Push-токен создаётся только на физическом iPhone или Android-устройстве." };
  if (!supabase) return { state: "unavailable", message: "Supabase не настроен в приложении." };
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { state: "unavailable", message: "Сначала войдите в аккаунт Dukenim." };
  const permission = await requestPushPermission();
  if (permission.state !== "granted") return permission;
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return { state: "unavailable", message: "Нужно связать приложение с EAS перед регистрацией push-токена." };
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.from("mobile_device_tokens").upsert(
    { user_id: user.id, token, platform: Platform.OS, enabled: true, updated_at: new Date().toISOString() },
    { onConflict: "user_id,token" },
  );
  if (error) return { state: "unavailable", message: "Не удалось безопасно зарегистрировать устройство. Попробуйте ещё раз." };
  localStorage.setItem(`dukenim.push.${user.id}`, token);
  return { state: "granted", message: "Устройство зарегистрировано для уведомлений Dukenim." };
}

/** Disable this installation before discarding its authenticated session. */
export async function disableCurrentDevicePush(): Promise<void> {
  if (!supabase || Platform.OS === "web" || !Device.isDevice) return;
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return;
  const storageKey = `dukenim.push.${user.id}`;
  let token = localStorage.getItem(storageKey);
  if (!token) {
    const permission = await Notifications.getPermissionsAsync();
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? Constants.expoConfig?.extra?.eas?.projectId;
    if (permission.granted && projectId) token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  }
  if (!token) return;
  const { error } = await supabase.from("mobile_device_tokens").update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id).eq("token", token);
  if (error) throw error;
  localStorage.removeItem(storageKey);
}
