import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { workspaceRoute } from "@/lib/owner";

export default function AuthCallback() {
  const url = Linking.useURL();
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    if (!url) {
      const timeout = setTimeout(() => {
        if (active) setFailure("Ссылка входа не найдена. Откройте её снова или вернитесь ко входу.");
      }, 5000);
      return () => { active = false; clearTimeout(timeout); };
    }
    const complete = async () => {
      try {
        if (!supabase) throw new Error("Подключение входа не настроено.");
        const parsed = Linking.parse(url);
        const fragment = url.includes("#") ? new URLSearchParams(url.split("#")[1]) : null;
        const query = parsed.queryParams;
        if (query?.error || fragment?.get("error")) {
          throw new Error("Ссылка входа отклонена или срок её действия истёк.");
        }
        const recovery = query?.type === "recovery" || fragment?.get("type") === "recovery";
        const current = await supabase.auth.getSession();
        if (current.error) throw new Error("Не удалось проверить текущий вход.");
        if (!current.data.session) {
          const code = typeof query?.code === "string" ? query.code : "";
          if (code) {
            const exchanged = await supabase.auth.exchangeCodeForSession(code);
            if (exchanged.error) throw new Error("Ссылка входа недействительна или уже использована.");
          } else {
            const access = fragment?.get("access_token");
            const refresh = fragment?.get("refresh_token");
            if (!access || !refresh) throw new Error("В ссылке нет данных для входа.");
            const session = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
            if (session.error) throw new Error("Не удалось подтвердить ссылку входа.");
          }
        }
        if (!active) return;
        if (recovery) setReady(true);
        else router.replace(await workspaceRoute() as never);
      } catch (error) {
        if (active) setFailure(error instanceof Error ? error.message : "Не удалось завершить вход.");
      }
    };
    void complete();
    return () => { active = false; };
  }, [url]);

  const save = async () => {
    if (!supabase || password.length < 10 || password !== confirm) {
      Alert.alert("Проверьте пароль", "Нужно не меньше 10 символов; оба поля должны совпадать.");
      return;
    }
    setPending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error("Запросите новую ссылку восстановления.");
      Alert.alert("Пароль обновлён");
      router.replace(await workspaceRoute() as never);
    } catch (error) {
      Alert.alert("Пароль не изменён", error instanceof Error ? error.message : "Повторите попытку.");
    } finally {
      setPending(false);
    }
  };

  return <SafeAreaView style={s.page}>
    {failure ? <View style={s.center}>
      <Text style={s.title}>Вход не завершён</Text>
      <Text style={s.copy}>{failure}</Text>
      <Pressable onPress={() => router.replace("/")} style={s.button}>
        <Text style={s.buttonText}>Вернуться ко входу</Text>
      </Pressable>
    </View> : !ready ? <View style={s.center}>
      <ActivityIndicator color={colors.navy} />
      <Text style={s.copy}>Проверяем защищённую ссылку…</Text>
      <Pressable onPress={() => router.replace("/")}><Text style={s.back}>Вернуться ко входу</Text></Pressable>
    </View> : <View style={s.center}>
      <Text style={s.title}>Новый пароль</Text>
      <Text style={s.copy}>Задайте пароль для входа на сайте и в приложении.</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Минимум 10 символов" style={s.input} />
      <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Повторите пароль" style={s.input} />
      <Pressable disabled={pending} onPress={() => void save()} style={s.button}>
        <Text style={s.buttonText}>Сохранить пароль</Text>
      </Pressable>
    </View>}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "white", padding: 24 },
  center: { flex: 1, justifyContent: "center", gap: 16 },
  title: { fontSize: 34, fontWeight: "900", color: colors.ink },
  copy: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: "center" },
  back: { color: colors.navy, fontWeight: "900", textAlign: "center" },
  input: { minHeight: 54, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  button: { minHeight: 54, borderRadius: 14, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "white", fontWeight: "900" },
});
