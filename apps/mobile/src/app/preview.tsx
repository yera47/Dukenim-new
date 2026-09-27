import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { AppScreen, ui } from "@/components/app-shell";
import { useOwnerStore } from "@/lib/use-owner-store";
import { colors, money, site } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Product = { id: string; title: string; description: string | null; price: number; images: string[]; category: string | null; is_active: boolean };
type Storefront = { template_key: string; hero_title: string | null; hero_subtitle: string | null; hero_image_url: string | null; hero_cta_label: string | null };

export default function Preview() {
  const { store, loading: storeLoading } = useOwnerStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Storefront | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!store || !supabase) return;
    setLoading(true);
    setError("");
    const [productResult, settingsResult] = await Promise.all([
      supabase.from("products").select("id,title,description,price,images,category,is_active").eq("tenant_id", store.id).eq("is_active", true).order("sort_order"),
      supabase.from("tenant_storefront_settings").select("template_key,hero_title,hero_subtitle,hero_image_url,hero_cta_label").eq("tenant_id", store.id).maybeSingle(),
    ]);
    if (productResult.error || settingsResult.error) setError("Не удалось загрузить актуальную витрину. Повторите позже.");
    else { setProducts((productResult.data ?? []) as Product[]); setSettings(settingsResult.data as Storefront | null); }
    setLoading(false);
  }, [store]);
  useEffect(() => { void load(); }, [load]);
  const groups = useMemo(() => Array.from(new Set(products.map(product => product.category?.trim()).filter((category): category is string => Boolean(category)))), [products]);
  const menu = settings?.template_key === "journal";
  const published = Boolean(store?.catalog_published);
  const publicUrl = store ? `${site}/s/${store.slug}` : "";
  return <AppScreen section="Предпросмотр" store={store?.name}>
    <View style={styles.notice}><Text style={styles.noticeTitle}>{published ? "Витрина опубликована" : "Черновик · виден только вам"}</Text><Text style={styles.noticeText}>Это предпросмотр содержимого в приложении. Перед отправкой ссылки откройте покупательскую витрину и проверьте её оформление.</Text></View>
    {(loading || storeLoading) ? <ActivityIndicator color={colors.navy} /> : error ? <View style={ui.card}><Text style={ui.error}>{error}</Text><Pressable onPress={() => void load()} style={ui.outline}><Text style={ui.outlineText}>Повторить</Text></Pressable></View> : <>
      <View style={[styles.hero, menu && styles.menuHero]}>{settings?.hero_image_url ? <Image alt="Обложка магазина" source={{ uri: settings.hero_image_url }} contentFit="cover" style={styles.heroImage} /> : null}<View style={styles.heroOverlay}><Text style={styles.heroEyebrow}>{menu ? "МЕНЮ И ИСТОРИИ" : "ГАЛЕРЕЯ"} · {store?.name}</Text><Text style={styles.heroTitle}>{settings?.hero_title || store?.name}</Text>{settings?.hero_subtitle ? <Text style={styles.heroSubtitle}>{settings.hero_subtitle}</Text> : null}<Text style={styles.heroCta}>{settings?.hero_cta_label || "Смотреть каталог"} →</Text></View></View>
      <Text style={ui.title}>{store?.business_vertical === "food" ? "Меню" : "Каталог"}</Text>
      {menu && groups.length > 0 ? <View style={styles.categories}>{groups.map(group => <View key={group} style={styles.category}><Text style={styles.categoryText}>{group}</Text></View>)}</View> : null}
      <View style={menu ? styles.menuList : styles.grid}>{products.map(product => <View key={product.id} style={menu ? styles.menuProduct : styles.product}><View style={menu ? styles.menuImage : styles.image}>{product.images?.[0] ? <Image alt={product.title} source={{ uri: product.images[0] }} contentFit="cover" style={styles.photo} /> : <Text style={styles.letter}>{product.title.slice(0, 1).toUpperCase()}</Text>}</View><View style={menu ? styles.menuDetails : undefined}><Text numberOfLines={2} style={styles.title}>{product.title}</Text>{menu && product.description ? <Text numberOfLines={2} style={styles.description}>{product.description}</Text> : null}<Text style={styles.price}>{money(product.price)}</Text></View></View>)}</View>
      {!products.length ? <View style={ui.card}><Text style={ui.cardTitle}>Добавьте первый товар</Text><Text style={ui.subtitle}>После сохранения он появится здесь и в веб-витрине.</Text></View> : null}
      {published ? <Pressable onPress={() => void Linking.openURL(publicUrl)} style={ui.button}><Text style={ui.buttonText}>Открыть витрину покупателя ↗</Text></Pressable> : null}
    </>}
  </AppScreen>;
}

const styles = StyleSheet.create({
  notice: { backgroundColor: colors.navySoft, borderRadius: 17, padding: 15, gap: 4 }, noticeTitle: { fontWeight: "900", color: colors.navyDark }, noticeText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  hero: { minHeight: 208, borderRadius: 24, overflow: "hidden", backgroundColor: colors.navyDark, justifyContent: "flex-end" }, menuHero: { minHeight: 155 }, heroImage: { ...StyleSheet.absoluteFill }, heroOverlay: { padding: 22, gap: 7, backgroundColor: "#1A1424AD" }, heroEyebrow: { color: "#F2DFE9", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }, heroTitle: { color: "white", fontSize: 29, fontWeight: "900" }, heroSubtitle: { color: "white", fontSize: 13, lineHeight: 19 }, heroCta: { color: "white", fontSize: 13, fontWeight: "900", marginTop: 5 },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, category: { borderRadius: 30, backgroundColor: colors.navySoft, paddingHorizontal: 12, paddingVertical: 8 }, categoryText: { color: colors.navyDark, fontWeight: "800", fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, product: { width: "48%", borderWidth: 1, borderColor: colors.line, borderRadius: 19, padding: 10, backgroundColor: "white", gap: 7 }, image: { aspectRatio: 1, borderRadius: 13, overflow: "hidden", backgroundColor: colors.navySoft, alignItems: "center", justifyContent: "center" }, photo: { width: "100%", height: "100%" }, letter: { fontSize: 38, fontWeight: "900", color: colors.navy }, title: { fontWeight: "900", color: colors.ink, fontSize: 14 }, price: { fontWeight: "900", color: colors.navyDark, marginTop: 2 },
  menuList: { gap: 9 }, menuProduct: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 10, backgroundColor: "white" }, menuImage: { width: 82, height: 82, borderRadius: 11, overflow: "hidden", backgroundColor: colors.navySoft, alignItems: "center", justifyContent: "center" }, menuDetails: { flex: 1, gap: 3 }, description: { color: colors.muted, fontSize: 11, lineHeight: 15 },
});
