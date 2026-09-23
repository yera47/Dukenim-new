import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as Device from "expo-device";
import AsyncStorage from "expo-sqlite/kv-store";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export type PushSetup = { state: "granted" | "denied" | "unavailable"; message: string };

const storageKeyFor = (userId: string) => `dukenim.push.${userId}`;

async function saveExpoPushToken(token: string, userId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const storageKey = storageKeyFor(userId);
  const previous = await AsyncStorage.getItem(storageKey);
  if (previous && previous !== token) {
    const disabled = await supabase
      .from("mobile_device_tokens")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("token", previous);
    if (disabled.error) throw disabled.error;
  }
  const { error } = await supabase.from("mobile_device_tokens").upsert(
    { user_id: userId, token, platform: Platform.OS, enabled: true, updated_at: new Date().toISOString() },
    { onConflict: "user_id,token" },
  );
  if (error) throw error;
  await AsyncStorage.setItem(storageKey, token);
}

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
  try { await saveExpoPushToken(token, user.id); }
  catch { return { state: "unavailable", message: "Не удалось безопасно зарегистрировать устройство. Попробуйте ещё раз." }; }
  return { state: "granted", message: "Устройство зарегистрировано для уведомлений Dukenim." };
}

/** Keep the Expo token current when APNs or FCM rotates the native token. */
export function listenForPushTokenChanges(): Notifications.EventSubscription | null {
  const client = supabase;
  if (Platform.OS === "web" || !Device.isDevice || !client) return null;
  return Notifications.addPushTokenListener(() => {
    void (async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) return;
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) return;
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      await saveExpoPushToken(token, user.id);
    })().catch(() => undefined);
  });
}

/** Disable this installation before discarding its authenticated session. */
export async function disableCurrentDevicePush(): Promise<void> {
  if (!supabase || Platform.OS === "web" || !Device.isDevice) return;
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return;
  const storageKey = storageKeyFor(user.id);
  let token = await AsyncStorage.getItem(storageKey);
  if (!token) {
    const permission = await Notifications.getPermissionsAsync();
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? Constants.expoConfig?.extra?.eas?.projectId;
    if (permission.granted && projectId) token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  }
  if (!token) return;
  const { error } = await supabase.from("mobile_device_tokens").update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id).eq("token", token);
  if (error) throw error;
  await AsyncStorage.removeItem(storageKey);
}
