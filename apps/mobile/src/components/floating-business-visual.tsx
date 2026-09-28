import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, ImageSourcePropType, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

type Props = { source: ImageSourcePropType; accessibilityLabel: string; style?: StyleProp<ViewStyle>; compact?: boolean };

export function FloatingBusinessVisual({ source, accessibilityLabel, style, compact = false }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const objectY = useRef(new Animated.Value(0)).current;
  const chipA = useRef(new Animated.Value(0)).current;
  const chipB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) { objectY.setValue(0); chipA.setValue(0); chipB.setValue(0); return; }
    const loop = (value: Animated.Value, duration: number, delay = 0) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const animations = [loop(objectY, 2600), loop(chipA, 2200, 240), loop(chipB, 2800, 520)];
    animations.forEach(animation => animation.start());
    return () => animations.forEach(animation => animation.stop());
  }, [chipA, chipB, objectY, reduceMotion]);

  const translate = (value: Animated.Value, distance: number) => value.interpolate({ inputRange: [0, 1], outputRange: [0, distance] });
  return <View pointerEvents="none" style={[s.root, compact && s.compact, style]}>
    <Animated.Image source={source} resizeMode="contain" accessibilityLabel={accessibilityLabel} style={[s.image, { transform: [{ translateY: translate(objectY, -7) }] }]} />
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.chip, s.chipA, { transform: [{ translateY: translate(chipA, -9) }, { translateX: translate(chipA, 3) }] }]}><Text style={s.icon}>✦</Text><Text style={s.label}>AI</Text></Animated.View>
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.chip, s.chipB, { transform: [{ translateY: translate(chipB, 7) }, { translateX: translate(chipB, -3) }] }]}><Text style={s.icon}>⌁</Text><Text style={s.label}>Заказ</Text></Animated.View>
  </View>;
}

const s = StyleSheet.create({
  root: { position: "relative", width: 238, height: 310 }, compact: { width: 205, height: 205 },
  image: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  chip: { position: "absolute", zIndex: 3, flexDirection: "row", alignItems: "center", gap: 5, minHeight: 30, paddingHorizontal: 9, borderRadius: 13, backgroundColor: "#FFFFFFE8", borderWidth: 1, borderColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: .13, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  chipA: { right: 2, top: 71 }, chipB: { left: 8, bottom: 48 }, icon: { color: "#7E315B", fontWeight: "900", fontSize: 12 }, label: { color: "#11222D", fontWeight: "900", fontSize: 10 },
});
