import Image from "next/image";

/** Reuses the official raster geometry; monochrome is presentation-only. */
export function DukenimLogo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return <span className="inline-flex shrink-0 items-center gap-2" aria-label="Dukenim" style={{ lineHeight: 1 }}>
    <Image src="/brand/dukenim-flat-symbol.png" alt="" width={23} height={25} style={{ width: 23, height: 25, objectFit: "contain", filter: inverse ? "brightness(0) invert(1)" : "brightness(0)" }}/>
    {!compact && <span style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.055em", lineHeight: 1, transform: "translateY(-1px)" }}>dukenim.</span>}
  </span>;
}
