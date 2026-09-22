/** Preserve the original D silhouette; tint only its small bottom door threshold. */
export function DukenimLogo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  const ink = inverse ? "#ffffff" : "#111820";
  return <span className="inline-flex shrink-0 items-center gap-2" aria-label="Dukenim" style={{lineHeight:1}}>
    <span aria-hidden="true" style={{display:"block",width:23,height:25,flex:"0 0 23px",background:`linear-gradient(to bottom, ${ink} 0 92%, var(--accent-bright) 92% 100%)`,mask:"url('/brand/dukenim-flat-symbol.png') center / contain no-repeat",WebkitMask:"url('/brand/dukenim-flat-symbol.png') center / contain no-repeat"}}/>
    {!compact && <span className="inline-flex items-baseline" style={{color:ink,fontSize:23,fontWeight:800,letterSpacing:"-.055em",lineHeight:"25px",transform:"translateY(-1px)"}}>dukenim<span style={{color:"var(--accent-bright)"}}>.</span></span>}
  </span>;
}
