import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#071B17] px-6 py-16 text-[#F4F0E8]">
      <div className="w-full max-w-[34rem] text-center">
        <p className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-[#B08A50]">Dukenim</p>
        <p className="mt-6 text-[clamp(4rem,18vw,7rem)] font-extrabold leading-none tracking-[-0.06em]">404</p>
        <h1 className="mt-4 text-[clamp(1.5rem,5vw,2.1rem)] font-bold leading-tight tracking-[-0.03em]">
          Такой страницы нет
        </h1>
        <p className="mx-auto mt-4 max-w-[40ch] text-[0.98rem] leading-7 text-[#E8DFD0]/80">
          Возможно, ссылка устарела или в адресе опечатка. Вернитесь на главную или создайте свой магазин.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-[0.72rem] bg-[#B08A50] px-5 font-extrabold text-[#071B17] transition-transform hover:-translate-y-0.5"
          >
            <Home size={18} /> На главную
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-[0.72rem] border border-[#F4F0E8]/25 px-5 font-extrabold text-[#F4F0E8] transition-colors hover:border-[#B08A50] hover:text-[#B08A50]"
          >
            Создать магазин <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </main>
  );
}
