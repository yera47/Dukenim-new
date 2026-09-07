import Image from "next/image";

/** Reuses the official raster geometry; monochrome is presentation-only. */
export function DukenimLogo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return <span className="inline-flex shrink-0 items-center gap-2" aria-label="Dukenim" style={{ lineHeight: 1 }}>
    <Image src="/brand/dukenim-flat-symbol.png" alt="" width={23} height={25} style={{ width: 23, height: 25, objectFit: "contain", filter: inverse ? "grayscale(1) invert(1)" : "grayscale(1)" }}/>
    {!compact && <span style={{ color: inverse ? "#ffffff" : "#111111", fontSize: 23, fontWeight: 800, letterSpacing: "-.055em", lineHeight: 1, transform: "translateY(-1px)" }}>dukenim<span style={{ color: "#888888" }}>.</span></span>}
  </span>;
}
