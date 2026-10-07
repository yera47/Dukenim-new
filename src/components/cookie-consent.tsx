"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [localFrame, setLocalFrame] = useState(false);
  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("ui-preview");
    const localHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const localPreview = localHost && preview === "1";
    setLocalFrame(localHost && preview === "cookie-390");
    setOpen(!localPreview && !document.cookie.includes("dukenim_cookie_consent="));
  }, []);

  function choose(value: "essential" | "all") {
    document.cookie = `dukenim_cookie_consent=${value}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
    setOpen(false);
  }

  if (!open) return null;
  return <section role="dialog" aria-label="Настройки cookies" style={localFrame?{left:12,right:"auto",width:366,maxWidth:"calc(100vw - 24px)"}:undefined} className="fixed inset-x-3 bottom-3 z-[100] min-w-0 rounded-[14px] border border-white/12 bg-[#171717]/95 p-4 text-white shadow-[0_18px_44px_rgb(0_0_0/.32)] backdrop-blur-xl sm:left-auto sm:w-[25rem]">
    <b className="text-sm">Cookies для стабильной работы</b>
    <p className="mt-1 text-xs leading-5 text-white/65">Необходимые cookies обеспечивают вход и безопасность. <Link href="/legal/cookies" className="font-bold text-white">Подробнее</Link></p>
    <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
      <button onClick={() => choose("essential")} className="btn min-h-10 w-full min-w-0 whitespace-normal border-white/15 bg-white/8 px-2 text-[11px] text-white sm:text-xs">Только необходимые</button>
      <button onClick={() => choose("all")} className="btn min-h-10 w-full min-w-0 whitespace-normal bg-white px-2 text-[11px] font-extrabold text-[#171717] sm:text-xs">Принять все</button>
    </div>
  </section>;
}
