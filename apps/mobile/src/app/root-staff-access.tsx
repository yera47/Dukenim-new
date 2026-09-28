import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, site } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Access = { id: string; email: string; storeName: string; title: string; active: boolean; revision: number };

export default function RootStaffAccess() {
  const { accessId } = useLocalSearchParams<{ accessId?: string }>();
  const [access, setAccess] = useState<Access | null>(null);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError(""); setAccess(null);
    try {
      if (!supabase || !accessId) throw new Error("Доступ не выбран");
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError || !data.session) throw new Error("Войдите заново");
      const response = await fetch(`${site}/api/mobile/root/accounts/staff-access?id=${encodeURIComponent(accessId)}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Доступ не загружен");
      setAccess(body.access as Access);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Доступ не загружен"); }
    finally { setLoading(false); }
  }, [accessId]);
  useEffect(() => { void load(); }, [load]);
  const submit = () => {
    if (!access || saving || email.trim().toLowerCase() !== access.email.toLowerCase() || reason.trim().length < 3) {
      Alert.alert("Проверьте подтверждение", "Введите точный email сотрудника и причину от 3 символов."); return;
    }
    const next = !access.active;
    Alert.alert(next ? "Восстановить доступ?" : "Отозвать доступ?", `${access.email}\n${access.storeName} · ${access.title}\nПричина: ${reason.trim()}`, [
      { text: "Отмена", style: "cancel" },
      { text: next ? "Восстановить" : "Отозвать", style: next ? "default" : "destructive", onPress: () => void (async () => {
        setSaving(true);
        try {
          if (!supabase) throw new Error("Подключение недоступно");
          const { data, error: authError } = await supabase.auth.getSession();
          if (authError || !data.session) throw new Error("Войдите заново");
          const response = await fetch(`${site}/api/mobile/root/accounts/staff-access`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ accessId: access.id, email: access.email, active: next, revision: access.revision, reason: reason.trim() }) });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Доступ не изменён");
          setEmail(""); setReason(""); await load();
          Alert.alert("Сохранено", next ? "Доступ восстановлен" : "Доступ отозван");
        } catch (cause) { Alert.alert("Не удалось сохранить", cause instanceof Error ? cause.message : "Повторите попытку"); }
        finally { setSaving(false); }
      })() },
    ]);
  };
  return <SafeAreaView style={s.safe}><View style={s.header}><Pressable accessibilityLabel="Назад" style={s.back} onPress={() => router.back()}><Text style={s.backText}>‹</Text></Pressable><View><Text style={s.eyebrow}>DUKENIM HQ</Text><Text style={s.heading}>Доступ сотрудника</Text></View></View><ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
    {loading ? <ActivityIndicator color={colors.navy} /> : null}{error ? <View style={s.card}><Text style={s.error}>{error}</Text><Pressable onPress={() => void load()}><Text style={s.link}>Повторить</Text></Pressable></View> : null}
    {access ? <><Text style={s.title}>{access.storeName}</Text><Text style={s.muted}>{access.title} · {access.active ? "доступ есть" : "доступ отозван"}</Text><Text style={s.muted}>Изменение касается только этого магазина. Права владельца не меняются. Действие сохраняется в аудите.</Text><View style={s.card}><Text style={s.label}>Введите email: {access.email}</Text><TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} /><Text style={s.label}>Причина изменения</Text><TextInput style={s.input} value={reason} onChangeText={setReason} multiline maxLength={1000} /><Pressable disabled={saving} style={s.button} onPress={submit}><Text style={s.buttonText}>{saving ? "Сохраняем…" : access.active ? "Отозвать доступ" : "Восстановить доступ"}</Text></Pressable></View></> : null}
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: "white" }, header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, back: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, borderWidth: 1, borderColor: colors.line }, backText: { fontSize: 30, lineHeight: 34, color: colors.navy }, eyebrow: { color: colors.navy, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }, heading: { color: colors.ink, fontSize: 17, fontWeight: "900" }, body: { padding: 20, paddingBottom: 45, gap: 15 }, title: { color: colors.ink, fontSize: 29, fontWeight: "900" }, muted: { color: colors.muted, fontSize: 13, lineHeight: 19 }, card: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, gap: 12 }, label: { fontSize: 13, color: colors.ink, fontWeight: "800" }, input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, color: colors.ink }, button: { minHeight: 52, justifyContent: "center", alignItems: "center", backgroundColor: colors.navy, borderRadius: 13 }, buttonText: { color: "white", fontWeight: "900" }, link: { color: colors.navy, fontWeight: "900" }, error: { color: colors.danger } });
