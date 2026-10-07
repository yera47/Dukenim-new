import { afterEach, expect, it, vi } from "vitest";
import { getUserTenant } from "./auth";

afterEach(() => vi.unstubAllEnvs());

it("uses the saved owner membership without touching draft tenant columns when archive is disabled", async () => {
  vi.stubEnv("ENABLE_STORE_ARCHIVE", "false");
  const selected = { data: { tenant_id: "11111111-1111-4111-8111-111111111111", role: "owner" }, error: null };
  const membershipQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => selected),
  };
  membershipQuery.select.mockReturnValue(membershipQuery);
  membershipQuery.eq.mockReturnValue(membershipQuery);
  const from = vi.fn((table: string) => {
    if (table !== "tenant_users") throw new Error(`Unexpected old-schema query: ${table}`);
    return membershipQuery;
  });

  const result = await getUserTenant({ from } as never, "owner-id", selected.data.tenant_id);

  expect(result).toEqual(selected);
  expect(from).toHaveBeenCalledTimes(1);
  expect(from).toHaveBeenCalledWith("tenant_users");
});

it("keeps the legacy first-store fallback for multiple memberships", async () => {
  vi.stubEnv("ENABLE_STORE_ARCHIVE", "false");
  const members = [
    { tenant_id: "11111111-1111-4111-8111-111111111111", role: "owner" },
    { tenant_id: "22222222-2222-4222-8222-222222222222", role: "owner" },
  ];
  const membershipQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    then: (resolve: (value: { data: typeof members; error: null }) => unknown) => resolve({ data: members, error: null }),
  };
  membershipQuery.select.mockReturnValue(membershipQuery);
  membershipQuery.eq.mockReturnValue(membershipQuery);
  const tenantQuery = {
    select: vi.fn(), in: vi.fn(), is: vi.fn(), order: vi.fn(), limit: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  };
  tenantQuery.select.mockReturnValue(tenantQuery);
  tenantQuery.in.mockReturnValue(tenantQuery);
  tenantQuery.order.mockReturnValue(tenantQuery);
  tenantQuery.limit.mockReturnValue(tenantQuery);
  const from = vi.fn((table: string) => table === "tenant_users" ? membershipQuery : tenantQuery);

  const result = await getUserTenant({ from } as never, "owner-id");

  expect(result).toEqual({ data: members[0], error: null });
  expect(tenantQuery.is).not.toHaveBeenCalled();
});
