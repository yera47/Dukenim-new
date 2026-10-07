import { useRef, type PropsWithChildren, type ReactNode } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { colors } from "@/lib/theme";
import logoMark from "../../assets/images/logo-mark-compact.png";
import { AppSymbol } from "@/components/app-symbol";
import { useMerchantBrand } from "@/components/merchant-brand-theme";

type Tab = { label: string; icon: Parameters<typeof AppSymbol>[0]["name"]; path: "/more" | "/orders" | "/catalog" | "/menu" };
const tabs: Tab[] = [
  { label: "Главная", icon: "house", path: "/more" },
  { label: "Заказы", icon: "list.bullet.rectangle", path: "/orders" },
  { label: "Каталог", icon: "square.grid.2x2", path: "/catalog" },
  { label: "Ещё", icon: "ellipsis", path: "/menu" },
];

export function BrandHeader({ section, store, logoUrl, backTo }: { section: string; store?: string; logoUrl?:string|null; backTo?: "/catalog" | "/orders" | "/more" }) {
  const{theme}=useMerchantBrand();
  return <View testID="merchant-brand-header" style={styles.header}>
    {backTo ? <Pressable accessibilityLabel="Назад" onPress={() => router.canGoBack() ? router.back() : router.replace(backTo as never)} style={styles.back}><Text style={styles.backArrow}>‹</Text></Pressable> : null}
    <View style={[styles.mark,logoUrl&&styles.storeMark,{backgroundColor:theme.surface,borderColor:`${theme.accent}30`,borderRadius:Math.min(theme.cardRadius,16)}]}><Image alt="" source={logoUrl?{uri:logoUrl}:logoMark} resizeMode="contain" style={logoUrl?styles.storeLogo:styles.logo} /></View>
    <View style={{ flex: 1 }}><Text style={[styles.section,{color:theme.accent}]}>{section.toUpperCase()}</Text><Text numberOfLines={1} style={styles.store}>{store || "Dukenim"}</Text></View>
  </View>;
}

export function BottomNav() {
  const{theme}=useMerchantBrand();
  const pathname = usePathname();
  const active = pathname.startsWith("/catalog") || pathname.startsWith("/product") ? "/catalog"
    : pathname.startsWith("/orders") || pathname.startsWith("/order") ? "/orders"
    : pathname.startsWith("/menu") ? "/menu" : "/more";
  return <GlassView testID="merchant-bottom-nav" glassEffectStyle="regular" tintColor={`${theme.surface}EE`} isInteractive style={[styles.nav,{borderRadius:Math.max(22,theme.cardRadius)}]}>{tabs.map(tab => {
    const selected = active === tab.path;
    return <Pressable testID={`merchant-tab-${tab.path.slice(1)}`} accessibilityRole="tab" accessibilityState={{ selected }} key={tab.path} onPress={() => router.replace(tab.path as never)} style={({ pressed }) => [styles.tab,{borderRadius:Math.max(16,theme.cardRadius-4)}, selected && styles.tabActive,selected&&{backgroundColor:`${theme.accent}16`}, pressed && styles.pressed]}>
      <AppSymbol name={tab.icon} size={19} color={selected?theme.accent:colors.muted}/><Text numberOfLines={1} style={[styles.tabText, selected && styles.tabTextActive,selected&&{color:theme.accent}]}>{tab.label}</Text>
    </Pressable>;
  })}</GlassView>;
}

export function AppScreen({ children, section, store, logoUrl, scroll = true, trailing }: PropsWithChildren<{ section: string; store?: string; logoUrl?:string|null; scroll?: boolean; trailing?: ReactNode }>) {
  const{theme}=useMerchantBrand();
  const pathname = usePathname();
  const { uiPreview, previewBottom } = useLocalSearchParams<{ uiPreview?: string; previewBottom?: string }>();
  const scrollRef=useRef<ScrollView>(null);
  const previewStyle = Platform.OS === "web" && uiPreview === "390" ? styles.preview390 : null;
  const root = pathname === "/catalog" || pathname === "/orders" || pathname === "/more" || pathname === "/menu";
  const backTo = root ? undefined : pathname === "/order" ? "/orders" : pathname === "/product-edit" || pathname === "/preview" ? "/catalog" : "/more";
  const body = <View style={[styles.content, !scroll && { flex: 1 }]}><BrandHeader section={section} store={store} logoUrl={logoUrl} backTo={backTo} />{trailing}{children}</View>;
  return <SafeAreaView style={[styles.safe,{backgroundColor:theme.background},previewStyle]} edges={["top", "left", "right", "bottom"]}><KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>{scroll ? <ScrollView testID={root?"merchant-root-scroll":undefined} ref={scrollRef} style={styles.scroller} showsVerticalScrollIndicator={false} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets onContentSizeChange={()=>{if(Platform.OS==="web"&&previewBottom==="1")scrollRef.current?.scrollToEnd({animated:false})}} contentContainerStyle={root ? styles.scroll : styles.nestedScroll}>{body}</ScrollView> : body}{root ? <BottomNav /> : null}</KeyboardAvoidingView></SafeAreaView>;
}

export const ui = StyleSheet.create({
  title: { color: colors.ink, fontSize: 32, fontWeight: "900", letterSpacing: -1.1 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: 20, padding: 18, gap: 10 },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  label: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  input: { width: "100%", maxWidth: "100%", minWidth: 0, minHeight: 52, borderWidth: 1, borderColor: "#C9D3DA", borderRadius: 14, paddingHorizontal: 14, backgroundColor: "#FFFFFF", color: colors.ink, fontSize: 16 },
  button: { minHeight: 52, borderRadius: 14, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonText: { color: "white", fontSize: 15, fontWeight: "900" },
  outline: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, backgroundColor: "white" },
  outlineText: { color: colors.navyDark, fontWeight: "900" },
  error: { color: colors.danger, lineHeight: 20 }, success: { color: colors.success, lineHeight: 20 },
  pressed: { opacity: .7, transform: [{ scale: .99 }] },
});

const styles = StyleSheet.create({
  safe: { flex: 1, width: "100%", maxWidth: "100%", minWidth:0, overflow: "hidden", backgroundColor: colors.stone }, preview390:{width:"100%",maxWidth:"100%",alignSelf:"stretch"}, keyboard: { flex: 1, width: "100%", maxWidth: "100%", minWidth: 0 }, scroller:{flex:1,width:"100%",maxWidth:"100%",minWidth:0}, scroll: { width: "100%", maxWidth: "100%", alignItems: "stretch", paddingBottom: 40 }, nestedScroll: { width: "100%", maxWidth: "100%", alignItems: "stretch", paddingBottom: 72 }, content: { width: "100%", maxWidth: "100%", boxSizing: "border-box", alignSelf: "stretch", minWidth: 0, paddingHorizontal: 20, paddingTop: 10, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 11, minHeight: 54, paddingBottom: 6 },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navySoft, alignItems: "center", justifyContent: "center" }, backArrow: { fontSize: 31, lineHeight: 33, color: colors.navyDark },
  mark: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", overflow:"hidden" }, storeMark:{width:68},logo: { width: 25, height: 27 }, storeLogo:{width:62,height:38},
  section: { color: colors.navy, fontSize: 9, fontWeight: "900", letterSpacing: 1.4 }, store: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 2 },
  nav: { flexShrink:0, alignSelf:"stretch", width:"auto", maxWidth:"100%", minWidth:0, boxSizing:"border-box", height: 72, marginHorizontal:12, marginTop:4, marginBottom:6, flexDirection: "row", alignItems: "stretch", borderRadius: 30, overflow: "hidden", borderWidth: 1, borderColor: "#FFFFFFCC", padding: 5, shadowColor: "#56334D", shadowOpacity: .16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  tab: { flex: 1, minWidth:0, borderRadius: 22, alignItems: "center", justifyContent: "center", gap: 3 }, tabActive: { backgroundColor: "#F2E7EFC7", borderWidth:1, borderColor:"#FFFFFFB8" }, tabText: { color: colors.muted, fontSize: 10, fontWeight: "800" }, tabTextActive: { color: colors.navyDark }, pressed: { opacity: .65 },
});
