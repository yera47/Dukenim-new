/** Reuses the official symbol geometry as a mask so the platform accent stays exact. */
export function DukenimLogo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  const symbol=inverse?"#ffffff":"var(--accent)";
  return <span className="inline-flex shrink-0 items-center gap-2" aria-label="Dukenim" style={{ lineHeight: 1 }}>
    <span aria-hidden style={{width:23,height:25,display:"block",flex:"0 0 23px",background:symbol,WebkitMask:"url('/brand/dukenim-flat-symbol.png') center / contain no-repeat",mask:"url('/brand/dukenim-flat-symbol.png') center / contain no-repeat"}}/>
    {!compact && <span className="inline-flex items-center" style={{ color: inverse ? "#ffffff" : "#111820", fontSize: 23, fontWeight: 800, letterSpacing: "-.055em", lineHeight: "25px" }}>dukenim<span style={{ color: inverse ? "#b9d5e8" : "var(--accent-bright)" }}>.</span></span>}
  </span>;
}
