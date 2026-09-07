"use client";
import{useEffect,useState}from"react";import{Download,X}from"lucide-react";
interface InstallEvent extends Event{prompt():Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>}
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [hide, setHide] = useState(false);
  useEffect(() => {
    const onPrompt = (value: Event) => { value.preventDefault(); setEvent(value as InstallEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  // Show the offer only when installation is actually available.
  if (hide || !event) return null;
  async function install() {
    try { await event?.prompt(); } finally { setHide(true); }
  }
  return <div className="fixed bottom-4 left-1/2 z-40 flex w-[min(520px,calc(100%-24px))] -translate-x-1/2 items-center gap-3 rounded-2xl bg-neutral-900 p-4 text-white shadow-2xl">
    <Download size={20}/><div className="flex-1"><b className="text-sm">Добавить магазин на экран</b><p className="text-xs text-white/60">Быстрый доступ к каталогу</p></div>
    <button onClick={() => { void install().catch(() => setHide(true)); }} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black">Установить</button>
    <button onClick={() => setHide(true)} aria-label="Закрыть предложение установки"><X size={18}/></button>
  </div>;
}
