import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { BulkStoreSelector } from "./bulk-selector";

export default async function RootStores() {
  const client = createAdminClient();
  const { data: stores, error, count } = await client.from("tenants")
    .select("id,name,slug,status,catalog_published,created_at", { count: "exact" })
    .order("created_at", { ascending: false }).limit(500);
  if (error || count === null || count > 500) return <main className="container py-10"><p role="alert">Не удалось полностью загрузить магазины. Обновите страницу.</p></main>;
  return <main className="container max-w-4xl py-8 text-[#111820]">
    <Link href="/root" className="text-sm font-bold text-[#56334D]">← Админ-обзор</Link>
    <h1 className="mt-5 text-3xl font-extrabold">Магазины платформы</h1>
    <p className="mt-2 text-sm text-slate-600">Выберите от 2 до 20 пустых магазинов. Сервер повторно проверит товары, заказы, клиентов, платежи и подключения. При ошибке ни один магазин не удалится.</p>
    <BulkStoreSelector stores={stores??[]} />
  </main>;
}
