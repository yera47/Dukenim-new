import { useEffect, useRef } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { notificationTarget } from "@/lib/notification-target";

export default function RootLayout() {
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (Platform.OS === "web") return;
    function open(response: Notifications.NotificationResponse) {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const request = response.notification.request;
      if (handled.current === request.identifier) return;
      const target = notificationTarget(request.content.data);
      if (!target) return;
      handled.current = request.identifier;
      router.push({ pathname: "/order", params: target });
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    }
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    const initial = Notifications.getLastNotificationResponse();
    if (initial) open(initial);
    return () => subscription.remove();
  }, []);
  return <><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, animation: "fade" }} /></>;
}
