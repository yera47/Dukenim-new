import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function getMarketingDashboard(client: SupabaseClient<Database>) {
  const [signals, content, sources, runs] = await Promise.all([
    client.from("marketing_signals").select("*").order("total_score", { ascending: false }).limit(30),
    client.from("marketing_content").select("*").order("created_at", { ascending: false }).limit(30),
    client.from("marketing_sources").select("*").order("weight", { ascending: false }),
    client.from("marketing_runs").select("*").order("started_at", { ascending: false }).limit(10),
  ]);
  return {
    signals: signals.data ?? [], content: content.data ?? [], sources: sources.data ?? [], runs: runs.data ?? [],
    error: signals.error ?? content.error ?? sources.error ?? runs.error,
  };
}
