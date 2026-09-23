/** Preserve the exact approved D silhouette; only the small threshold is accented. */
export function DukenimLogo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  const ink = inverse ? "#ffffff" : "#111820";
  return <span className="inline-flex shrink-0 items-center gap-2" aria-label="Dukenim" style={{lineHeight:1}}>
    <span aria-hidden="true" style={{display:"block",width:23,height:25,flex:"0 0 23px",backgroundImage:`url('${inverse ? "/brand/dukenim-symbol-current-reversed.png" : "/brand/dukenim-symbol-current.png"}')`,backgroundPosition:"center",backgroundRepeat:"no-repeat",backgroundSize:"contain"}}/>
    {!compact && <span className="inline-flex items-baseline" style={{color:ink,fontSize:23,fontWeight:800,letterSpacing:"-.055em",lineHeight:"25px",transform:"translateY(-1px)"}}>dukenim<span style={{color:"var(--accent-bright)"}}>.</span></span>}
  </span>;
}
