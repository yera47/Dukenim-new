import{readFileSync}from"node:fs";
import{resolve}from"node:path";
import{describe,expect,it}from"vitest";

const sql=readFileSync(resolve(process.cwd(),"supabase/drafts/ai_photo_studio_persistence.sql"),"utf8");
describe("AI Photo Studio SQL draft security shape",()=>{
  it("keeps tenant RLS and direct client writes closed",()=>{
    expect(sql.match(/enable row level security/gi)).toHaveLength(3);
    expect(sql).toContain("revoke all on public.ai_photo_jobs,public.ai_photo_outputs,public.ai_photo_pack_ledger from public,anon,authenticated");
    expect(sql).not.toMatch(/grant (insert|update|delete|all).* to authenticated/i);
    expect(sql.match(/u\.tenant_id=ai_photo_/g)?.length).toBe(3);
  });
  it("makes approval and quota one service-only idempotent transaction",()=>{
    expect(sql).toContain("security definer");
    expect(sql).toContain("on conflict(tenant_id,job_id) do update");
    expect(sql).toContain("revoke all on function public.record_ai_photo_review");
    expect(sql).toContain("grant execute on function public.record_ai_photo_review");
  });
  it("preserves separate illustration, text and detail QA layers",()=>{
    expect(sql).toContain("illustration_layer jsonb");
    expect(sql).toContain("text_layer jsonb");
    expect(sql).toContain("detail_passport jsonb");
    expect(sql).toContain("failed_critical_details jsonb");
  });
});
