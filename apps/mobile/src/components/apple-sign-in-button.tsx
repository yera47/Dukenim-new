import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { appleAuthReady } from "@/lib/social-auth";

export function AppleSignInButton({ onPress, pending, registration = false }: {
  onPress: () => void;
  pending: boolean;
  registration?: boolean;
}) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios" || !appleAuthReady) return;
    let active = true;
    void AppleAuthentication.isAvailableAsync()
      .then(result => { if (active) setAvailable(result); })
      .catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, []);

  if (!available) return null;
  return <View pointerEvents={pending ? "none" : "auto"} style={pending && styles.pending}>
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={registration ? AppleAuthentication.AppleAuthenticationButtonType.CONTINUE : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
      cornerRadius={14}
      style={styles.button}
      onPress={() => { if (!pending) onPress(); }}
    />
  </View>;
}

const styles = StyleSheet.create({
  button: { width: "100%", height: 50 },
  pending: { opacity: 0.6 },
});
