"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";

// Route-level error boundary for the (marketing / storefront / cabinet) tree.
// Kept usable and on-brand without depending on globals being loaded correctly.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface the failure to the browser console; real error tracking is a separate launch-gate item.
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#071B17] px-6 py-16 text-[#F4F0E8]">
      <div className="w-full max-w-[34rem] text-center">
        <p className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-[#B08A50]">Dukenim</p>
        <h1 className="mt-6 text-[clamp(1.7rem,5vw,2.4rem)] font-bold leading-tight tracking-[-0.03em]">
          Что-то пошло не так
        </h1>
        <p className="mx-auto mt-4 max-w-[42ch] text-[0.98rem] leading-7 text-[#E8DFD0]/80">
          Мы не смогли открыть эту страницу. Попробуйте обновить — если это повторится, вернитесь на главную и напишите нам.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[0.72rem] text-[#E8DFD0]/45">код ошибки: {error.digest}</p>
        )}
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-[0.72rem] bg-[#B08A50] px-5 font-extrabold text-[#071B17] transition-transform hover:-translate-y-0.5"
          >
            <RotateCcw size={18} /> Обновить страницу
          </button>
          <Link
            href="/"
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-[0.72rem] border border-[#F4F0E8]/25 px-5 font-extrabold text-[#F4F0E8] transition-colors hover:border-[#B08A50] hover:text-[#B08A50]"
          >
            На главную <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </main>
  );
}
