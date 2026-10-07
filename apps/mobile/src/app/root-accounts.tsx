import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, site } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Account = { id: string; email: string | null; role: string; blocked: boolean; lastSignIn: string | null; stores: { name: string; role: string; active: boolean; accessId?: string; revision?: number }[] };

export default function RootAccounts() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [possiblyMore, setPossiblyMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError(""); setAccounts([]);
    try {
      if (!supabase) throw new Error("Подключение недоступно");
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError || !data.session) throw new Error("Войдите заново");
      const response = await fetch(`${site}/api/mobile/root/accounts?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Аккаунты не загружены");
      setAccounts(body.accounts as Account[]); setPossiblyMore(Boolean(body.possiblyMore));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Аккаунты не загружены"); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => { void load(); }, [load]);
  return <SafeAreaView style={s.safe}><View style={s.header}><Pressable onPress={() => router.back()} accessibilityLabel="Назад" style={s.back}><Text style={s.backText}>‹</Text></Pressable><View><Text style={s.eyebrow}>DUKENIM HQ</Text><Text style={s.headerTitle}>Аккаунты</Text></View></View><ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
    <Text style={s.title}>Доступ к платформе</Text><Text style={s.muted}>Роли и магазины читаются из защищённой базы. Эта страница не меняет права.</Text>
    <View style={s.searchRow}><TextInput style={[s.input, { flex: 1 }]} placeholder="Email или ID" value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} onSubmitEditing={() => setQuery(search.trim())} /><Pressable style={s.button} onPress={() => setQuery(search.trim())}><Text style={s.buttonText}>Найти</Text></Pressable></View>
    {loading ? <ActivityIndicator color={colors.navy} /> : null}
    {error ? <View style={s.card}><Text style={s.error}>{error}</Text><Pressable style={s.button} onPress={() => void load()}><Text style={s.buttonText}>Повторить</Text></Pressable></View> : null}
    {!loading && !error ? <><Text style={s.eyebrow}>НАЙДЕНО {accounts.length}{possiblyMore ? " · ПОКАЗАНЫ ПЕРВЫЕ 1000" : ""}</Text>{accounts.length ? accounts.map(account => <View key={account.id} style={s.card}><Text style={s.value}>{account.email ?? "Email не указан"}</Text><Text style={s.id}>{account.id}</Text><View style={s.badges}><Text style={s.badge}>{account.role}</Text>{account.blocked ? <Text style={s.blocked}>Новые входы заблокированы</Text> : null}</View>{account.email && account.role !== "superadmin" ? <Pressable onPress={() => router.push({ pathname: "/root-account-login" as never, params: { id: account.id } })}><Text style={s.link}>{account.blocked ? "Разрешить новые входы" : "Блокировать новые входы"} →</Text></Pressable> : null}{account.stores.length ? account.stores.map((store, index) => store.accessId && account.email ? <Pressable key={`${store.name}-${index}`} onPress={() => router.push({ pathname: "/root-staff-access" as never, params: { accessId: store.accessId } })}><Text style={s.link}>{store.name} · {store.role} · {store.active ? "доступен" : "отозван"} →</Text></Pressable> : <Text key={`${store.name}-${index}`} style={s.muted}>{store.name} · {store.role} · {store.active ? "доступен" : "отозван"}</Text>) : <Text style={s.muted}>Нет доступа к магазину</Text>}<Text style={s.muted}>Последний вход: {account.lastSignIn ? new Date(account.lastSignIn).toLocaleString("ru-RU") : "не входил"}</Text></View>) : <View style={s.card}><Text style={s.muted}>Аккаунтов по запросу нет</Text></View>}</> : null}
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: "white" }, header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, back: { width: 42, height: 42, justifyContent: "center", alignItems: "center", borderRadius: 21, borderWidth: 1, borderColor: colors.line }, backText: { fontSize: 30, lineHeight: 34, color: colors.navy }, eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: colors.navy }, headerTitle: { fontSize: 17, fontWeight: "900", color: colors.ink }, body: { padding: 20, paddingBottom: 40, gap: 13 }, title: { fontSize: 30, fontWeight: "900", color: colors.ink }, muted: { color: colors.muted, fontSize: 13, lineHeight: 19 }, searchRow: { flexDirection: "row", gap: 8 }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 12, color: colors.ink }, button: { minHeight: 48, borderRadius: 13, paddingHorizontal: 14, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }, buttonText: { color: "white", fontWeight: "900" }, card: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, gap: 7 }, value: { fontSize: 16, fontWeight: "800", color: colors.ink }, id: { color: colors.muted, fontSize: 10 }, badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, badge: { paddingHorizontal: 9, paddingVertical: 5, backgroundColor: colors.navySoft, borderRadius: 8, color: colors.navyDark, fontSize: 11, fontWeight: "800" }, blocked: { paddingHorizontal: 9, paddingVertical: 5, backgroundColor: "#FFF1F1", borderRadius: 8, color: colors.danger, fontSize: 11, fontWeight: "700" }, link: { color: colors.navy, fontSize: 13, fontWeight: "800" }, error: { color: colors.danger } });
