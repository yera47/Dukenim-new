import type { PropsWithChildren, ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";
import logoMark from "../../assets/images/logo-mark-compact.png";

type Tab = { label: string; icon: string; path: "/studio" | "/catalog" | "/orders" | "/more" };
const tabs: Tab[] = [
  { label: "AI Studio", icon: "✦", path: "/studio" },
  { label: "Каталог", icon: "□", path: "/catalog" },
  { label: "Заказы", icon: "▤", path: "/orders" },
  { label: "Ещё", icon: "☰", path: "/more" },
];

export function BrandHeader({ section, store }: { section: string; store?: string }) {
  return <View style={styles.header}>
    <View style={styles.mark}><Image alt="" source={logoMark} resizeMode="contain" style={styles.logo} /></View>
    <View style={{ flex: 1 }}><Text style={styles.section}>{section.toUpperCase()}</Text><Text numberOfLines={1} style={styles.store}>{store || "Dukenim"}</Text></View>
  </View>;
}

export function BottomNav() {
  const pathname = usePathname();
  const active = pathname.startsWith("/catalog") || pathname.startsWith("/product") ? "/catalog"
    : pathname.startsWith("/orders") || pathname.startsWith("/order") ? "/orders"
    : pathname.startsWith("/studio") ? "/studio" : "/more";
  return <View style={styles.nav}>{tabs.map(tab => {
    const selected = active === tab.path;
    return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={tab.path} onPress={() => router.replace(tab.path as never)} style={({ pressed }) => [styles.tab, selected && styles.tabActive, pressed && styles.pressed]}>
      <Text style={[styles.tabIcon, selected && styles.tabTextActive]}>{tab.icon}</Text><Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
    </Pressable>;
  })}</View>;
}

export function AppScreen({ children, section, store, scroll = true, trailing }: PropsWithChildren<{ section: string; store?: string; scroll?: boolean; trailing?: ReactNode }>) {
  const body = <View style={[styles.content, !scroll && { flex: 1 }]}><BrandHeader section={section} store={store} />{trailing}{children}</View>;
  return <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>{scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>{body}</ScrollView> : body}<BottomNav /></SafeAreaView>;
}

export const ui = StyleSheet.create({
  title: { color: colors.ink, fontSize: 32, fontWeight: "900", letterSpacing: -1.1 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: 20, padding: 18, gap: 10 },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  label: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  input: { minHeight: 52, borderWidth: 1, borderColor: "#C9D3DA", borderRadius: 14, paddingHorizontal: 14, backgroundColor: "#FFFFFF", color: colors.ink, fontSize: 16 },
  button: { minHeight: 52, borderRadius: 14, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonText: { color: "white", fontSize: 15, fontWeight: "900" },
  outline: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, backgroundColor: "white" },
  outlineText: { color: colors.navyDark, fontWeight: "900" },
  error: { color: colors.danger, lineHeight: 20 }, success: { color: colors.success, lineHeight: 20 },
  pressed: { opacity: .7, transform: [{ scale: .99 }] },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stone }, scroll: { paddingBottom: 110 }, content: { paddingHorizontal: 20, paddingTop: 10, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 11, minHeight: 54, paddingBottom: 6 },
  mark: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }, logo: { width: 25, height: 27 },
  section: { color: colors.navy, fontSize: 9, fontWeight: "900", letterSpacing: 1.4 }, store: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 2 },
  nav: { position: "absolute", left: 12, right: 12, bottom: 10, height: 72, flexDirection: "row", alignItems: "stretch", borderRadius: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.line, padding: 5, shadowColor: "#102535", shadowOpacity: .12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  tab: { flex: 1, borderRadius: 19, alignItems: "center", justifyContent: "center", gap: 3 }, tabActive: { backgroundColor: colors.navySoft }, tabIcon: { color: colors.muted, fontSize: 19, fontWeight: "800" }, tabText: { color: colors.muted, fontSize: 10, fontWeight: "800" }, tabTextActive: { color: colors.navyDark }, pressed: { opacity: .65 },
});
