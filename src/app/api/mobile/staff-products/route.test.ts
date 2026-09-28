import { beforeEach, expect, it, vi } from "vitest";
import sharp from "sharp";

const authorize = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));
const client = vi.hoisted(() => vi.fn());
vi.mock("@/lib/mobile-auth", () => ({ getMobileStaff: authorize }));
vi.mock("@supabase/supabase-js", () => ({ createClient: client }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { POST } from "./route";

const access = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";
function request(stock = "0", image?: File) {
  const form = new FormData();
  form.set("access", access); form.set("request", requestId);
  form.set("title", "Круассан"); form.set("description", "С сыром");
  form.set("price", "1500"); form.set("stock", stock);
  if (image) form.append("images", image);
  return new Request("https://example.test/api/mobile/staff-products", { method: "POST", headers: { authorization: `Bearer ${"x".repeat(30)}` }, body: form });
}
beforeEach(() => { authorize.mockReset(); authorize.mockResolvedValue(null); client.mockReset(); });

it("rejects missing bearer credentials before reading uploads", async () => {
  const response = await POST(new Request("https://example.test/api/mobile/staff-products", { method: "POST" }));
  expect(response.status).toBe(401);
  expect(authorize).not.toHaveBeenCalled();
});
it("rejects a revoked catalog grant before privileged reads", async () => {
  const response = await POST(request());
  expect(response.status).toBe(403);
  expect(authorize).toHaveBeenCalledWith(expect.any(Request), access, "catalog", "write");
  expect(client).not.toHaveBeenCalled();
});
it("requires stock write access for a positive initial quantity", async () => {
  authorize.mockResolvedValue({ member: { permissions: { catalog: "write", stock: "read" } } });
  const response = await POST(request("3"));
  expect(response.status).toBe(403);
  expect(client).not.toHaveBeenCalled();
});
it("saves a hidden product through the caller-scoped RPC with a stable request id", async () => {
  const rpc = vi.fn(async () => ({ data: requestId, error: null }));
  const admin = { from: (table: string) => table === "tenants"
    ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { status: "active", catalog_status: "ready" }, error: null }) }) }) }
    : { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) } };
  authorize.mockResolvedValue({ admin, user: { id: "employee" }, member: { tenant_id: "tenant", permissions: { catalog: "write", stock: "none" } } });
  client.mockReturnValue({ rpc });
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: requestId });
  expect(rpc).toHaveBeenCalledWith("staff_create_product", { p_access: access, p_request: requestId, p_data: { title: "Круассан", description: "С сыром", price: 1500, stock: 0, images: [] } });
  expect(authorize).toHaveBeenCalledTimes(2);
});
it("normalizes an uploaded photo and stores it under the authenticated employee path", async () => {
  const rpc = vi.fn<(name: string, args: Record<string, unknown>) => Promise<{ data: string; error: null }>>().mockResolvedValue({ data: requestId, error: null });
  const upload = vi.fn<(path: string, data: Buffer, options: { contentType: string }) => Promise<{ error: null }>>().mockResolvedValue({ error: null });
  const bucket = { upload, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://abc.supabase.co/storage/v1/object/public/product-images/${path}` } }) };
  const admin = { from: (table: string) => table === "tenants"
    ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { status: "active", catalog_status: "ready" }, error: null }) }) }) }
    : { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) },
  storage: { from: () => bucket } };
  authorize.mockResolvedValue({ admin, user: { id: "employee" }, member: { tenant_id: "tenant", permissions: { catalog: "write", stock: "none" } } });
  client.mockReturnValue({ rpc });
  const png = await sharp({ create: { width: 4, height: 4, channels: 4, background: "#ffffff" } }).png().toBuffer();
  const response = await POST(request("0", new File([png], "photo.png", { type: "image/png" })));
  expect(response.status).toBe(200);
  expect(upload).toHaveBeenCalledOnce();
  const [path, data, options] = upload.mock.calls[0];
  expect(path).toMatch(new RegExp(`^tenant/staff/employee/${requestId}/[a-f0-9-]+\\.webp$`));
  expect((await sharp(data).metadata()).format).toBe("webp");
  expect(options.contentType).toBe("image/webp");
  expect(rpc).toHaveBeenCalledWith("staff_create_product", expect.objectContaining({ p_data: expect.objectContaining({ images: [bucket.getPublicUrl(path).data.publicUrl] }) }));
});
