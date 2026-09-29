import type { PropsWithChildren, ReactNode } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { colors } from "@/lib/theme";
import logoMark from "../../assets/images/logo-mark-compact.png";

type Tab = { label: string; icon: string; path: "/studio" | "/catalog" | "/orders" | "/more" };
const tabs: Tab[] = [
  { label: "AI Studio", icon: "✦", path: "/studio" },
  { label: "Каталог", icon: "□", path: "/catalog" },
  { label: "Заказы", icon: "▤", path: "/orders" },
  { label: "Главная", icon: "◫", path: "/more" },
];

export function BrandHeader({ section, store, backTo }: { section: string; store?: string; backTo?: "/catalog" | "/orders" | "/more" }) {
  return <View style={styles.header}>
    {backTo ? <Pressable accessibilityLabel="Назад" onPress={() => router.canGoBack() ? router.back() : router.replace(backTo as never)} style={styles.back}><Text style={styles.backArrow}>‹</Text></Pressable> : null}
    <View style={styles.mark}><Image alt="" source={logoMark} resizeMode="contain" style={styles.logo} /></View>
    <View style={{ flex: 1 }}><Text style={styles.section}>{section.toUpperCase()}</Text><Text numberOfLines={1} style={styles.store}>{store || "Dukenim"}</Text></View>
  </View>;
}

export function BottomNav() {
  const pathname = usePathname();
  const active = pathname.startsWith("/catalog") || pathname.startsWith("/product") ? "/catalog"
    : pathname.startsWith("/orders") || pathname.startsWith("/order") ? "/orders"
    : pathname.startsWith("/studio") ? "/studio" : "/more";
  return <GlassView glassEffectStyle="regular" tintColor="#F9F3F7DD" isInteractive style={styles.nav}>{tabs.map(tab => {
    const selected = active === tab.path;
    return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={tab.path} onPress={() => router.replace(tab.path as never)} style={({ pressed }) => [styles.tab, selected && styles.tabActive, pressed && styles.pressed]}>
      <Text style={[styles.tabIcon, selected && styles.tabTextActive]}>{tab.icon}</Text><Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
    </Pressable>;
  })}</GlassView>;
}

export function AppScreen({ children, section, store, scroll = true, trailing }: PropsWithChildren<{ section: string; store?: string; scroll?: boolean; trailing?: ReactNode }>) {
  const pathname = usePathname();
  const root = pathname === "/catalog" || pathname === "/orders" || pathname === "/more";
  const backTo = root ? undefined : pathname === "/order" ? "/orders" : pathname === "/product-edit" || pathname === "/preview" ? "/catalog" : "/more";
  const body = <View style={[styles.content, !scroll && { flex: 1 }]}><BrandHeader section={section} store={store} backTo={backTo} />{trailing}{children}</View>;
  return <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}><KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>{scroll ? <ScrollView keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={root ? styles.scroll : styles.nestedScroll}>{body}</ScrollView> : body}{root ? <BottomNav /> : null}</KeyboardAvoidingView></SafeAreaView>;
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
  safe: { flex: 1, backgroundColor: colors.stone }, keyboard: { flex: 1 }, scroll: { paddingBottom: 150 }, nestedScroll: { paddingBottom: 72 }, content: { paddingHorizontal: 20, paddingTop: 10, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 11, minHeight: 54, paddingBottom: 6 },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navySoft, alignItems: "center", justifyContent: "center" }, backArrow: { fontSize: 31, lineHeight: 33, color: colors.navyDark },
  mark: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }, logo: { width: 25, height: 27 },
  section: { color: colors.navy, fontSize: 9, fontWeight: "900", letterSpacing: 1.4 }, store: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 2 },
  nav: { position: "absolute", left: 12, right: 12, bottom: 10, height: 72, flexDirection: "row", alignItems: "stretch", borderRadius: 30, overflow: "hidden", borderWidth: 1, borderColor: "#FFFFFFCC", padding: 5, shadowColor: "#56334D", shadowOpacity: .16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  tab: { flex: 1, borderRadius: 22, alignItems: "center", justifyContent: "center", gap: 3 }, tabActive: { backgroundColor: "#F2E7EFC7", borderWidth:1, borderColor:"#FFFFFFB8" }, tabIcon: { color: colors.muted, fontSize: 19, fontWeight: "800" }, tabText: { color: colors.muted, fontSize: 10, fontWeight: "800" }, tabTextActive: { color: colors.navyDark }, pressed: { opacity: .65 },
});
