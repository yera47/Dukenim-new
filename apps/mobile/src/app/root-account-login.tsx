import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, site } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Account = { id: string; email: string; blocked: boolean };
export default function RootAccountLogin() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError(""); setAccount(null);
    try {
      if (!supabase || !id) throw new Error("Аккаунт не выбран");
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError || !data.session) throw new Error("Войдите заново");
      const response = await fetch(`${site}/api/mobile/root/accounts/login-access?id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Аккаунт не загружен");
      setAccount(body.account as Account);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Аккаунт не загружен"); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  const submit = () => {
    if (!account || saving || email.trim().toLowerCase() !== account.email.toLowerCase() || reason.trim().length < 5) {
      Alert.alert("Проверьте подтверждение", "Введите точный email и причину от 5 символов."); return;
    }
    const block = !account.blocked;
    Alert.alert(block ? "Блокировать новые входы?" : "Разрешить новые входы?", `${account.email}\nПричина: ${reason.trim()}\nУже действующие сессии могут работать до истечения токена.`, [
      { text: "Назад", style: "cancel" },
      { text: block ? "Блокировать" : "Разрешить", style: block ? "destructive" : "default", onPress: () => void (async () => {
        setSaving(true);
        try {
          if (!supabase) throw new Error("Подключение недоступно");
          const { data, error: authError } = await supabase.auth.getSession();
          if (authError || !data.session) throw new Error("Войдите заново");
          const response = await fetch(`${site}/api/mobile/root/accounts/login-access`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ userId: account.id, email: account.email, expectedBlocked: account.blocked, block, reason: reason.trim() }) });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Вход не изменён");
          setEmail(""); setReason(""); await load(); Alert.alert("Сохранено", block ? "Новые входы заблокированы" : "Новые входы разрешены");
        } catch (cause) { Alert.alert("Не удалось сохранить", cause instanceof Error ? cause.message : "Повторите попытку"); }
        finally { setSaving(false); }
      })() },
    ]);
  };
  return <SafeAreaView style={s.safe}><View style={s.header}><Pressable accessibilityLabel="Назад" style={s.back} onPress={() => router.back()}><Text style={s.backText}>‹</Text></Pressable><View><Text style={s.eyebrow}>DUKENIM HQ</Text><Text style={s.heading}>Вход в аккаунт</Text></View></View><ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
    {loading ? <ActivityIndicator color={colors.navy} /> : null}{error ? <View style={s.card}><Text style={s.error}>{error}</Text><Pressable onPress={() => void load()}><Text style={s.link}>Повторить</Text></Pressable></View> : null}
    {account ? <><Text style={s.title}>{account.email}</Text><Text style={s.muted}>{account.blocked ? "Новые входы заблокированы" : "Новые входы разрешены"}</Text><Text style={s.muted}>Изменение не отзывает уже выданные сессии мгновенно. Аккаунт superadmin нельзя заблокировать здесь.</Text><View style={s.card}><Text style={s.label}>Введите email для подтверждения</Text><TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} /><Text style={s.label}>Причина изменения</Text><TextInput style={s.input} value={reason} onChangeText={setReason} multiline maxLength={1000} /><Pressable disabled={saving} style={s.button} onPress={submit}><Text style={s.buttonText}>{saving ? "Сохраняем…" : account.blocked ? "Разрешить новые входы" : "Блокировать новые входы"}</Text></Pressable></View></> : null}
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: "white" }, header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, back: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, borderWidth: 1, borderColor: colors.line }, backText: { fontSize: 30, lineHeight: 34, color: colors.navy }, eyebrow: { color: colors.navy, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }, heading: { color: colors.ink, fontSize: 17, fontWeight: "900" }, body: { padding: 20, paddingBottom: 45, gap: 15 }, title: { color: colors.ink, fontSize: 26, fontWeight: "900" }, muted: { color: colors.muted, fontSize: 13, lineHeight: 19 }, card: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, gap: 12 }, label: { fontSize: 13, color: colors.ink, fontWeight: "800" }, input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, color: colors.ink }, button: { minHeight: 52, justifyContent: "center", alignItems: "center", backgroundColor: colors.navy, borderRadius: 13 }, buttonText: { color: "white", fontWeight: "900" }, link: { color: colors.navy, fontWeight: "900" }, error: { color: colors.danger } });
