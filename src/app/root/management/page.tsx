import Link from "next/link";
import { ControlInventory } from "@/components/admin/control-inventory";

export default function ManagementPage() {
  return <main className="min-h-screen bg-[var(--surface)] px-5 py-10"><div className="mx-auto max-w-5xl"><Link href="/root" className="text-sm font-bold text-[var(--accent)]">← Центр управления</Link><h1 className="mt-6 text-3xl font-extrabold">Карта управления Dukenim</h1><p className="muted mt-2">Рабочие возможности и задачи, которые ещё требуют реализации или внешнего подключения.</p><ControlInventory root /></div></main>;
}
