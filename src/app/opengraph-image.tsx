import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteEyebrow, sitePromise, brand } from "@/lib/site";

export const runtime = "nodejs";
export const alt = "Dukenim — продажи 24/7. Одна ссылка вместо сотни сообщений.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function font(file: string) {
  return readFile(join(process.cwd(), "src/assets/fonts", file));
}

export default async function OpengraphImage() {
  const [regular, bold] = await Promise.all([font("Manrope-500.ttf"), font("Manrope-700.ttf")]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px 84px",
          background: `linear-gradient(115deg, ${brand.blackJade} 0%, ${brand.graphite} 62%, #05110e 100%)`,
          color: brand.paleStone,
          fontFamily: "Manrope",
          position: "relative",
        }}
      >
        {/* Quiet architectural threshold, echoing the doorway mark. */}
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -80,
            width: 520,
            height: 520,
            border: `2px solid ${brand.agedGold}`,
            opacity: 0.28,
            transform: "rotate(45deg)",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: brand.paleStone,
              color: brand.blackJade,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            D
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: brand.agedGold,
            }}
          >
            {siteEyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ display: "flex", fontSize: 82, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 960 }}>
            {sitePromise}.
          </div>
          <div style={{ display: "flex", fontSize: 30, lineHeight: 1.4, color: "rgba(244,240,232,0.82)", maxWidth: 900 }}>
            Покупатель выбирает и заказывает сам. Вы ведёте товары, остатки и заказы в одном кабинете.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 24, color: "rgba(244,240,232,0.7)" }}>
          <div style={{ display: "flex", padding: "10px 18px", borderRadius: 999, background: brand.agedGold, color: brand.blackJade, fontWeight: 700 }}>
            7 дней бесплатно
          </div>
          <div style={{ display: "flex" }}>dukenim.kz · Казахстан · тенге</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Manrope", data: regular, weight: 500, style: "normal" },
        { name: "Manrope", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
