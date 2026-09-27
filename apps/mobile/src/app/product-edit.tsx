import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppScreen, ui } from "@/components/app-shell";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

const numeric = (value: string) => value.replace(/\D/g, "").slice(0, 9);

export default function ProductEdit() {
  const { productId, tenantId } = useLocalSearchParams<{ productId: string; tenantId: string }>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [active, setActive] = useState(true);
  const [variantId, setVariantId] = useState("");
  const [stock, setStock] = useState("");
  const [originalStock, setOriginalStock] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase || !productId || !tenantId) { router.replace("/catalog"); return; }
    let current = true;
    void Promise.all([
      supabase.from("products").select("title,description,price,old_price,is_active").eq("id", productId).eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("product_variants").select("id,stock_qty").eq("product_id", productId).eq("tenant_id", tenantId).eq("is_active", true).order("id").limit(1).maybeSingle(),
    ]).then(([product, variant]) => {
      if (!current) return;
      if (product.error || variant.error || !product.data) {
        Alert.alert("Товар недоступен", "Обновите каталог и попробуйте снова.");
        router.replace("/catalog");
        return;
      }
      setTitle(product.data.title);
      setDescription(product.data.description ?? "");
      setPrice(String(product.data.price));
      setOldPrice(product.data.old_price ? String(product.data.old_price) : "");
      setActive(product.data.is_active);
      if (variant.data) {
        setVariantId(variant.data.id);
        setStock(String(variant.data.stock_qty));
        setOriginalStock(String(variant.data.stock_qty));
      }
      setLoading(false);
    });
    return () => { current = false; };
  }, [productId, tenantId]);

  const save = async () => {
    const amount = Number(price);
    const old = oldPrice ? Number(oldPrice) : null;
    const qty = Number(stock);
    if (!supabase || !productId || !tenantId || title.trim().length < 2 ||
      !price || !Number.isSafeInteger(amount) || amount < 1 ||
      (old !== null && (!Number.isSafeInteger(old) || old < amount)) ||
      (variantId && (!stock || !Number.isInteger(qty) || qty < 0 || qty > 1_000_000))) {
      Alert.alert("Проверьте поля", "Укажите название, цену и целый остаток от 0 до 1 000 000.");
      return;
    }
    setSaving(true);
    const product = await supabase.from("products").update({
      title: title.trim(), description: description.trim(), price: amount,
      old_price: old, is_active: active,
    }).eq("id", productId).eq("tenant_id", tenantId).select("id").maybeSingle();
    if (product.error || !product.data) {
      setSaving(false);
      Alert.alert("Товар не сохранён", "Обновите данные и повторите.");
      return;
    }
    if (variantId && stock !== originalStock) {
      const inventory = await supabase.rpc("set_variant_stock", {
        p_tenant_id: tenantId, p_variant_id: variantId, p_target: qty,
      });
      if (inventory.error) {
        setSaving(false);
        Alert.alert("Карточка обновлена, остаток — нет", "Проверьте текущий остаток в разделе «Склад» и повторите корректировку.");
        return;
      }
    }
    setSaving(false);
    Alert.alert("Товар обновлён");
    router.replace("/catalog");
  };

  return <AppScreen section="Каталог"><Text style={ui.title}>Изменить товар</Text><Text style={ui.subtitle}>Изменения сразу синхронизируются с веб-кабинетом и витриной.</Text>{loading ? <ActivityIndicator color={colors.navy} /> : <View style={ui.card}>
    <Field label="Название"><TextInput value={title} onChangeText={setTitle} style={ui.input} /></Field>
    <Field label="Описание"><TextInput value={description} onChangeText={setDescription} multiline style={[ui.input, s.area]} /></Field>
    <View style={s.row}><View style={{ flex: 1 }}><Field label="Цена, ₸"><TextInput value={price} onChangeText={v => setPrice(numeric(v))} keyboardType="number-pad" style={ui.input} /></Field></View><View style={{ flex: 1 }}><Field label="Старая цена"><TextInput value={oldPrice} onChangeText={v => setOldPrice(numeric(v))} keyboardType="number-pad" style={ui.input} /></Field></View></View>
    {variantId ? <Field label="Остаток"><TextInput value={stock} onChangeText={v => setStock(numeric(v))} keyboardType="number-pad" style={ui.input} /></Field> : null}
    <View style={s.toggle}><View style={{ flex: 1 }}><Text style={ui.label}>Показывать в каталоге</Text><Text style={ui.subtitle}>{active ? "Покупатели видят товар" : "Товар скрыт, данные сохранены"}</Text></View><Switch value={active} onValueChange={setActive} trackColor={{ false: "#D7DEE3", true: colors.navy }} /></View>
    <Pressable disabled={saving} onPress={() => void save()} style={ui.button}>{saving ? <ActivityIndicator color="white" /> : <Text style={ui.buttonText}>Сохранить изменения</Text>}</Pressable>
  </View>}</AppScreen>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <View style={{ gap: 7 }}><Text style={ui.label}>{label}</Text>{children}</View>; }
const s = StyleSheet.create({ area: { minHeight: 96, paddingTop: 13, textAlignVertical: "top" }, row: { flexDirection: "row", gap: 10 }, toggle: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.navySoft, borderRadius: 14, padding: 13 } });
