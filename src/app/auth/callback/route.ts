import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export async function GET(request: Request) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const next = url.searchParams.get("next");
  const target = new URL(next?.startsWith("/") ? next : "/login", url.origin);
  const response = NextResponse.redirect(target);
  if (!code || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return response;
  const client = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => [], setAll: (values) => values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } });
  await client.auth.exchangeCodeForSession(code);
  return response;
}
