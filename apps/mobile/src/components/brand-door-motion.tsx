import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, StyleSheet, useWindowDimensions } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { usePathname } from "expo-router";
import { doorMotionPlan, shouldDismissDoorMotion, shouldPlayDoorEntry } from "@/lib/brand-door-policy";

const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><path fill="#171A18" d="M14 10h40c35 0 54 20 54 50s-19 50-54 50H14V10Zm24 24v52l25-8V42L38 34Z"/><path fill="#171A18" d="M38 86h25l8 32H30l8-32Z"/></svg>`;
const markSource = { uri: `data:image/svg+xml;utf8,${encodeURIComponent(markSvg)}` };
type SceneKind = "entry" | "exit";
type MotionContext = { playExit: () => Promise<void>; showStatic: () => void; dismiss: () => void };
const Context = createContext<MotionContext>({ playExit: async () => undefined, showStatic: () => undefined, dismiss: () => undefined });

export function BrandDoorMotionProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [kind, setKind] = useState<SceneKind>("entry");
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const pendingResolve = useRef<(() => void) | null>(null);
  const doorwayScale = Math.max(18, width / 24, height / 48) * 1.12;

  const dismiss = useCallback(() => {
    animation.current?.stop();
    animation.current = null;
    setVisible(false);
    pendingResolve.current?.();
    pendingResolve.current = null;
  }, []);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => listener.remove();
  }, []);

  useEffect(() => {
    const listener = AppState.addEventListener("change", state => {
      if (shouldDismissDoorMotion(state)) dismiss();
    });
    return () => listener.remove();
  }, [dismiss]);

  useEffect(() => () => {
    animation.current?.stop();
    animation.current = null;
    pendingResolve.current?.();
    pendingResolve.current = null;
  }, []);

  const run = useCallback((nextKind: SceneKind) => new Promise<void>(resolve => {
    dismiss();
    const plan = doorMotionPlan(nextKind, reduceMotion);
    setKind(nextKind);
    setVisible(true);
    progress.setValue(0);
    pendingResolve.current = resolve;
    const next = Animated.timing(progress, {
      toValue: 1,
      duration: plan.duration,
      easing: reduceMotion ? Easing.out(Easing.quad) : Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.current = next;
    next.start(({ finished }) => {
      if (!finished) return;
      animation.current = null;
      setVisible(false);
      pendingResolve.current?.();
      pendingResolve.current = null;
    });
  }), [dismiss, progress, reduceMotion]);

  useEffect(() => {
    const play = shouldPlayDoorEntry(previous.current, pathname);
    previous.current = pathname;
    if (play) void run("entry");
  }, [pathname, run]);

  const showStatic = useCallback(() => {
    dismiss();
    setKind("entry");
    progress.setValue(.34);
    setVisible(true);
  }, [dismiss, progress]);
  const value = useMemo(() => ({ playExit: () => run("exit"), showStatic, dismiss }), [dismiss, run, showStatic]);

  const entryScale = progress.interpolate({ inputRange: [0, .2, 1], outputRange: [.76, 1, doorwayScale] });
  const exitScale = progress.interpolate({ inputRange: [0, .78, 1], outputRange: [doorwayScale, 1, .76] });
  const regularBackdrop = kind === "entry"
    ? progress.interpolate({ inputRange: [0, .7, 1], outputRange: [1, 1, 0] })
    : progress.interpolate({ inputRange: [0, .2, .92, 1], outputRange: [0, 1, 1, 0] });
  const reducedBackdrop = progress.interpolate({ inputRange: [0, .35, 1], outputRange: [0, .9, 0] });
  const markOpacity = reduceMotion
    ? progress.interpolate({ inputRange: [0, .35, 1], outputRange: [0, 1, 0] })
    : kind === "entry"
      ? progress.interpolate({ inputRange: [0, .74, 1], outputRange: [1, 1, 0] })
      : progress.interpolate({ inputRange: [0, .12, .9, 1], outputRange: [0, 1, 1, 0] });

  return <Context.Provider value={value}>
    {children}
    {visible ? <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[s.overlay, { opacity: reduceMotion ? reducedBackdrop : regularBackdrop }]}
    >
      <Animated.View style={{ opacity: markOpacity, transform: [{ scale: reduceMotion ? 1 : kind === "entry" ? entryScale : exitScale }] }}>
        <ExpoImage accessibilityLabel="" source={markSource} contentFit="contain" style={s.mark} />
      </Animated.View>
    </Animated.View> : null}
  </Context.Provider>;
}

export const useBrandDoorMotion = () => useContext(Context);

const s = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFDF8",
    overflow: "hidden",
    pointerEvents: "none",
  },
  mark: { width: 120, height: 120 },
});
