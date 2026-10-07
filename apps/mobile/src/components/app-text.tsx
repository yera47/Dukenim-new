import { Text as NativeText, StyleSheet, type TextProps } from "react-native";

export function AppText({ style, ...props }: TextProps) {
  const weight = String(StyleSheet.flatten(style)?.fontWeight ?? "400");
  const bold = weight === "bold" || (Number.parseInt(weight, 10) >= 600);
  return <NativeText {...props} style={[{ fontFamily: bold ? "ManropeBold" : "Manrope" }, style]} />;
}
