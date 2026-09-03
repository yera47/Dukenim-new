import { AbsoluteFill, Composition, Easing, interpolate, useCurrentFrame } from "remotion";

type Props = { readonly storeName: string };

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const MyComposition = () => (
  <Composition
    id="DukenimHeroFlow"
    component={DukenimHeroFlow}
    durationInFrames={480}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{ storeName: "Dukenim" }}
  />
);

export const DukenimHeroFlow: React.FC<Props> = ({ storeName }) => {
  const frame = useCurrentFrame();
  const productToCart = interpolate(frame, [120, 190], [0, 1], { ...clamp, easing: ease });
  const cartToOrder = interpolate(frame, [240, 310], [0, 1], { ...clamp, easing: ease });
  const crmReveal = interpolate(frame, [315, 390], [0, 1], { ...clamp, easing: ease });
  const entrance = interpolate(frame, [0, 42], [0, 1], { ...clamp, easing: ease });

  return (
    <AbsoluteFill style={{ background: "#090c0d", color: "#f1eadc", fontFamily: "Arial, sans-serif", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 76% 36%, #252825 0%, #111514 34%, #090c0d 70%)" }} />
      <div style={{ position: "absolute", left: 112, top: 94, letterSpacing: 8, color: "#cba860", fontSize: 20, opacity: entrance }}>
        {storeName.toUpperCase()} / BUSINESS SYSTEM
      </div>
      <div style={{ position: "absolute", left: 112, top: 170, width: 680, opacity: entrance, translate: `${interpolate(frame, [0, 42], [0, 24], { ...clamp, easing: ease })}px 0` }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 104, lineHeight: 0.95 }}>Каждый заказ<br />в одном месте.</div>
        <div style={{ marginTop: 42, fontSize: 28, lineHeight: 1.5, color: "#c8c3b9", maxWidth: 600 }}>Каталог, оплата и CRM работают как одна спокойная, точная система.</div>
      </div>

      <div style={{ position: "absolute", right: 160, bottom: 80, width: 890, height: 760, opacity: entrance, scale: interpolate(frame, [0, 48], [0.94, 1], { ...clamp, easing: ease, output: "perceptual-scale" }) }}>
        <div style={{ position: "absolute", inset: "44% 4% 0", background: "linear-gradient(145deg, #1f2321, #0c0f0f 70%)", clipPath: "polygon(0 42%, 83% 0, 100% 70%, 15% 100%)", boxShadow: "0 40px 80px #000" }} />
        <div style={{ position: "absolute", left: 98, bottom: 20, width: 700, height: 90, background: "linear-gradient(90deg,#242825,#101413)", borderTop: "1px solid #6f5b31", transform: "skewY(-8deg)" }} />
        <div style={{ position: "absolute", left: 254, top: 126, width: 470, height: 300, border: "1px solid #8a7447", background: "#181d1b", boxShadow: "0 26px 45px #000", overflow: "hidden" }}>
          <div style={{ height: 46, borderBottom: "1px solid #615637", display: "flex", alignItems: "center", padding: "0 18px", gap: 8, color: "#d6b56c", fontSize: 14 }}><i>●</i><i>●</i><i>●</i><b style={{ marginLeft: 14, color: "#e7dfcf" }}>DUKENIM / CRM</b></div>
          <div style={{ display: "flex", height: 254 }}><div style={{ width: 104, borderRight: "1px solid #41483f", padding: 20, color: "#9ca094", fontSize: 14, lineHeight: 2.1 }}>Главная<br />Заказы<br />Клиенты<br />Товары</div><div style={{ padding: 30, flex: 1 }}><div style={{ color: "#bdb4a2", fontSize: 14 }}>Продажи</div><div style={{ fontSize: 31, fontWeight: 700, marginTop: 9 }}>8 246 190 ₸</div><div style={{ height: 74, marginTop: 34, borderBottom: "2px solid #cba860", clipPath: "polygon(0 75%, 12% 58%, 20% 65%, 34% 32%, 46% 47%, 60% 19%, 74% 35%, 86% 7%, 100% 21%,100% 100%,0 100%)", background: `linear-gradient(180deg, transparent, rgba(203,168,96,${crmReveal * 0.22}))` }} /></div></div>
          <div style={{ position: "absolute", right: 20, bottom: 20, padding: "10px 14px", background: "#cba860", color: "#111", fontWeight: 700, opacity: crmReveal }}>Новый заказ</div>
        </div>
        <div style={{ position: "absolute", right: 40, top: 34, width: 250, height: 214, background: "#e9e0cd", color: "#20221d", padding: 24, boxSizing: "border-box", boxShadow: "0 22px 34px #000", translate: `${interpolate(frame, [0, 90, 205], ["0px 18px", "0px 0px", `${-productToCart * 150}px ${productToCart * 170}px`], { ...clamp, easing: ease })}` }}>
          <div style={{ fontSize: 12, letterSpacing: 2, color: "#6d624e" }}>СУМКА / ATELIER</div><div style={{ marginTop: 18, fontSize: 26, fontWeight: 700 }}>Kerege bag</div><div style={{ width: 80, height: 64, background: "#665947", borderRadius: 6, marginTop: 12 }} /><div style={{ position: "absolute", right: 18, bottom: 16, fontWeight: 700 }}>48 900 ₸</div>
        </div>
        <div style={{ position: "absolute", right: 100, bottom: 6, width: 238, height: 505, borderRadius: 34, border: "10px solid #121413", background: "#f1e9da", color: "#20221d", boxShadow: "0 26px 48px #000", overflow: "hidden" }}>
          <div style={{ width: 92, height: 20, background: "#121413", borderRadius: 20, margin: "10px auto" }} />
          <div style={{ padding: "13px 20px", fontSize: 14, fontWeight: 700, borderBottom: "1px solid #d5ccbb" }}>{cartToOrder > 0.5 ? "Заказ" : productToCart > 0.5 ? "Корзина" : "Каталог"}</div>
          <div style={{ padding: 20 }}>
            {cartToOrder > 0.5 ? <><div style={{ margin: "72px auto 22px", width: 58, height: 58, borderRadius: 60, display: "grid", placeItems: "center", background: "#cba860", fontSize: 30 }}>✓</div><b style={{ display: "block", textAlign: "center", fontSize: 20 }}>Заказ оформлен</b><p style={{ textAlign: "center", color: "#776f61", fontSize: 13 }}>Мы получили вашу оплату</p></> : <><div style={{ height: 150, background: "#6d604c", borderRadius: 8 }} /><b style={{ display: "block", marginTop: 16 }}>Сумка Atelier</b><span style={{ color: "#776f61" }}>48 900 ₸</span><div style={{ marginTop: 28, padding: 13, background: "#1a1d19", color: "#f1e9da", fontWeight: 700, textAlign: "center" }}>{productToCart > 0.5 ? "Перейти к оплате" : "В корзину"}</div></>}
          </div>
        </div>
        <div style={{ position: "absolute", left: 6, top: 270, width: 600, height: 1, background: "#cba860", opacity: 0.55, rotate: "-22deg" }} />
      </div>
      <div style={{ position: "absolute", left: 112, bottom: 80, display: "flex", gap: 32, fontSize: 17, color: "#cba860", letterSpacing: 1 }}><span>01 КАТАЛОГ</span><span>02 КОРЗИНА</span><span>03 ОПЛАТА</span><span style={{ opacity: crmReveal }}>04 CRM</span></div>
    </AbsoluteFill>
  );
};
