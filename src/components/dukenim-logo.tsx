/** Official Dukenim symbol geometry with the door threshold as the sole accent. */
export function DukenimLogo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  const ink = inverse ? "#ffffff" : "#111820";
  return <span className="inline-flex shrink-0 items-end gap-2" aria-label="Dukenim" style={{lineHeight:1}}>
    <svg aria-hidden="true" viewBox="0 0 120 120" width="25" height="25" style={{display:"block",flex:"0 0 25px"}}>
      <path fill={ink} d="M14 10h40c35 0 54 20 54 50s-19 50-54 50H14V10Zm24 24v52l25-8V42L38 34Z"/>
      <path fill="var(--accent-bright)" d="M38 86h25l8 32H30l8-32Z"/>
    </svg>
    {!compact && <span className="inline-flex items-baseline" style={{color:ink,fontSize:23,fontWeight:800,letterSpacing:"-.055em",lineHeight:"25px"}}>dukenim<span style={{color:"var(--accent-bright)"}}>.</span></span>}
  </span>;
}
