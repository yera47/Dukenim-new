import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20261009181408_ai_product_photo_generation_ledger.sql"), "utf8");

describe("AI product-photo production migration", () => {
  it("starts disabled and does not seed an allowance, price, or spend cap", () => {
    expect(sql).toContain("kill_switch boolean not null default true");
    expect(sql).toContain("owner_usd_micros_cap bigint not null default 0");
    expect(sql).not.toMatch(/insert into public\.ai_product_credit_price_rules/i);
    expect(sql).not.toMatch(/\b90\b/);
    expect(sql).not.toMatch(/5000000/);
  });

  it("reserves under locks and verifies the server estimate against an active price rule", () => {
    expect(sql).toMatch(/platform_control where singleton=true for update/i);
    expect(sql).toMatch(/accounts where tenant_id=p_tenant_id for update/i);
    expect(sql).toContain("estimated_usd_micros_per_output=p_expected_usd_micros_per_output");
    expect(sql).toContain("return query select v_existing.id,false");
  });

  it("requires a durable tenant path before settlement and charges actual saved provider cost", () => {
    expect(sql).toContain("p_storage_path not like p_tenant_id::text||'/%'");
    expect(sql).toContain("Successful outputs do not match all durable provider outputs");
    expect(sql).toContain("sum(coalesce(actual_usd_micros,estimated_usd_micros))");
    expect(sql).toContain("reconcile_ai_product_provider_cost");
    expect(sql).toContain("ai_product_credit_provider_costs");
    expect(sql).toContain("spent_usd_micros=spent_usd_micros+v_actual_usd");
  });

  it("releases confirmed non-billed reservations but keeps uncertain reservations reserved", () => {
    expect(sql).toContain("release_ai_product_credit_reservation");
    expect(sql).toContain("mark_ai_product_credit_reservation_uncertain");
    expect(sql).toContain("set status='uncertain'");
    expect(sql).toContain("('reserved','processing','uncertain')");
    expect(sql).toContain("Reservation requires reconciliation");
  });

  it("closes direct writes and privileged RPCs", () => {
    expect(sql.match(/enable row level security/gi)).toHaveLength(7);
    expect(sql).toContain("revoke all on public.ai_product_credit_accounts");
    expect(sql.match(/revoke all on function public\./g)).toHaveLength(6);
    expect(sql.match(/to service_role/g)?.length ?? 0).toBeGreaterThanOrEqual(7);
  });

  it("uses a private bucket and never stores a permanent public URL", () => {
    expect(sql).toContain("values('ai-product-photos','ai-product-photos',false");
    expect(sql).toContain("ai-product-photos bucket exists with unsafe settings");
    expect(sql).toContain("public");
    expect(sql).toContain("file_size_limit is distinct from 10000000");
    expect(sql).toContain("allowed_mime_types is distinct from array['image/jpeg']::text[]");
    expect(sql).not.toMatch(/image_url text/);
  });
});
