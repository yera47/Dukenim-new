import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql=readFileSync(resolve(process.cwd(),"supabase/drafts/ai_product_credit_ledger.sql"),"utf8");
describe("AI product-credit ledger draft",()=>{
  it("is tenant-scoped, RLS protected and service-only for reserve/settle",()=>{
    expect(sql).toContain("unique(tenant_id,idempotency_key)");
    expect(sql.match(/enable row level security/gi)).toHaveLength(8);
    expect(sql).toContain("grant execute on function public.reserve_ai_product_credits");
    expect(sql).toContain("to service_role");
  });
  it("locks account/platform budgets and cannot settle twice or below zero",()=>{
    expect(sql).toMatch(/platform_control where singleton=true for update/i);
    expect(sql).toMatch(/accounts where tenant_id=p_tenant_id for update/i);
    expect(sql).toContain("reserved_allowance>=v_row.reserved_allowance_credits");
    expect(sql).toContain("reserved_purchased>=v_row.reserved_purchased_credits");
    expect(sql).toContain("v_account.spent_usd_micros+v_account.reserved_usd_micros+v_usd");
    expect(sql).toContain("reserved_usd_micros=reserved_usd_micros-v_row.reserved_usd_micros");
    expect(sql).toContain("if v_row.status in ('settled','partially_settled','failed','canceled') then return v_row");
  });
  it("requires confirmed pricing, 2-5 outputs, capped attempts and owner-only manual grants",()=>{
    expect(sql).toContain("p_output_count not between 2 and 5");
    expect(sql).toContain("estimated_usd_micros_per_output is not null");
    expect(sql).toContain("attempt_count smallint not null default 0 check (attempt_count between 0 and 3)");
    expect(sql).toContain("if not public.is_superadmin() then raise exception 'Forbidden'");
    expect(sql).toContain("admin_configure_ai_credit_controls");
  });
  it("keeps purchased IAP credits separate and charges only persisted valid outputs",()=>{
    expect(sql).toContain("allowance_period_ends_at timestamptz");
    expect(sql).toContain("purchased_balance integer not null");
    expect(sql).not.toMatch(/purchased_(balance|credits).*expir/i);
    expect(sql).toContain("saved_at is not null and accessible and technical_valid");
    expect(sql).toContain("Successful output count does not match saved accessible technical-valid outputs");
    expect(sql).toContain("Provider API cost is tracked separately from product-credit accounting");
  });
  it("enforces the one-job Premium trial under the tenant/account locks",()=>{
    expect(sql).toContain("premium_trial_job_started_at timestamptz");
    expect(sql).toContain("premium_trial_job_consumed_at timestamptz");
    expect(sql).toContain("select * into v_tenant from public.tenants where id=p_tenant_id for update");
    expect(sql).toContain("and v_account.premium_trial_job_started_at is null");
    expect(sql).toContain("where tenant_id=p_tenant_id and premium_trial_job_started_at is null");
    expect(sql).toContain("Premium trial job already used");
    expect(sql).toContain("premium_trial_reservation_id=v_row.id");
  });
  it("deduplicates provider/webhook events before any future top-up grant",()=>{
    expect(sql).toContain("primary key(provider,provider_event_id)");
    expect(sql).toContain("payload_sha256");
    expect(sql).not.toMatch(/paddle|polar/i);
  });
});
