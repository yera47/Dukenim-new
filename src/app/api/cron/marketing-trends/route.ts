import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseRss, scoreSignal } from "@/lib/marketing/scoring";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createAdminClient();
  const { data: run } = await client.from("marketing_runs").insert({ job: "trend_scan", status: "running" }).select("id").single();
  let processed = 0;
  const errors: string[] = [];

  try {
    const { data: sources, error } = await client.from("marketing_sources").select("*").eq("enabled", true);
    if (error) throw error;

    for (const source of sources ?? []) {
      try {
        const response = await fetch(source.url, { headers: { "user-agent": "DukenimTrendBot/1.0" }, cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const items = parseRss(await response.text());
        for (const item of items) {
          const score = scoreSignal(item.title, item.summary, source.weight);
          const { error: upsertError } = await client.from("marketing_signals").upsert({
            source_id: source.id, external_id: item.externalId, title: item.title, url: item.url || null,
            summary: item.summary || null, published_at: item.publishedAt, relevance_score: score.relevance,
            velocity_score: score.velocity, raw: { source: source.name },
          }, { onConflict: "source_id,external_id", ignoreDuplicates: true });
          if (upsertError) throw upsertError;
          processed += 1;
        }
        await client.from("marketing_sources").update({ last_checked_at: new Date().toISOString() }).eq("id", source.id);
      } catch (cause) {
        errors.push(`${source.name}: ${cause instanceof Error ? cause.message : "unknown error"}`);
      }
    }

    if (run) await client.from("marketing_runs").update({ status: errors.length ? "failed" : "success", items_processed: processed, details: { errors }, finished_at: new Date().toISOString() }).eq("id", run.id);
    return NextResponse.json({ ok: errors.length === 0, processed, errors });
  } catch (cause) {
    if (run) await client.from("marketing_runs").update({ status: "failed", details: { error: cause instanceof Error ? cause.message : "unknown error" }, finished_at: new Date().toISOString() }).eq("id", run.id);
    return NextResponse.json({ error: "Trend scan failed" }, { status: 500 });
  }
}
