import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getMobileStaff } from "@/lib/mobile-auth";
import { staffCan } from "@/lib/staff-permissions";
import { staffProductSchema } from "@/lib/staff-product";

export const runtime = "nodejs";
const maxBody = 3_500_000;
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.{20,})$/i)?.[1];
  if (!token) return fail("Войдите в аккаунт сотрудника.", 401);
  if (Number(request.headers.get("content-length") || 0) > maxBody) return fail("Файлы слишком большие.", 413);
  let form: FormData;
  try {
    const reader = request.body?.getReader();
    if (!reader) return fail("Не удалось прочитать форму.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBody) { await reader.cancel(); return fail("Файлы слишком большие.", 413); }
      chunks.push(value);
    }
    form = await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") || "" }, body: Buffer.concat(chunks) }).formData();
  } catch { return fail("Не удалось прочитать форму.", 400); }
  const parsed = staffProductSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Проверьте название, цену и остаток.", 400);
  const input = parsed.data;
  const context = await getMobileStaff(request, input.access, "catalog", "write");
  if (!context) return fail("Нет доступа к каталогу магазина.", 403);
  if (input.stock > 0 && !staffCan(context.member.permissions, "stock", "write")) return fail("Для начального остатка нужен доступ к складу.", 403);
  const files = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > 4 || files.reduce((total, file) => total + file.size, 0) > 3_000_000) return fail("До 4 фотографий, суммарно до 3 МБ.", 400);

  const tenant = await context.admin.from("tenants").select("status,trial_ends_at,catalog_status").eq("id", context.member.tenant_id).maybeSingle();
  if (tenant.error || !tenant.data || tenant.data.catalog_status === "not_started" || !(tenant.data.status === "active" || (tenant.data.status === "trial" && Date.parse(tenant.data.trial_ends_at ?? "") > Date.now()))) return fail("Сначала создайте каталог и проверьте тариф.", 403);
  const existing = await context.admin.from("products").select("id").eq("id", input.request).eq("tenant_id", context.member.tenant_id).maybeSingle();
  if (existing.error) return fail("Не удалось проверить повторное сохранение.", 503);
  if (existing.data) return NextResponse.json({ id: existing.data.id }, { headers: { "Cache-Control": "private, no-store" } });

  const paths: string[] = [];
  const images: string[] = [];
  let saveStarted = false;
  try {
    for (const file of files) {
      const source = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 16_000_000, animated: false });
      const metadata = await source.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) throw new Error("Unsupported image");
      const buffer = await source.rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      const path = `${context.member.tenant_id}/staff/${context.user.id}/${input.request}/${crypto.randomUUID()}.webp`;
      const bucket = context.admin.storage.from("product-images");
      const uploaded = await bucket.upload(path, buffer, { contentType: "image/webp", upsert: false });
      if (uploaded.error) throw uploaded.error;
      paths.push(path);
      images.push(bucket.getPublicUrl(path).data.publicUrl);
    }
    const current = await getMobileStaff(request, input.access, "catalog", "write");
    if (!current || (input.stock > 0 && !staffCan(current.member.permissions, "stock", "write"))) throw new Error("Access changed");
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    saveStarted = true;
    const result = await client.rpc("staff_create_product", { p_access: input.access, p_request: input.request, p_data: { title: input.title, description: input.description, price: input.price, stock: input.stock, images } });
    if (result.error || !result.data) throw result.error || new Error("No product id");
    revalidatePath("/staff"); revalidatePath("/admin/catalog");
    return NextResponse.json({ id: result.data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    if (!saveStarted && paths.length) await context.admin.storage.from("product-images").remove(paths);
    return fail("Сохранение не подтверждено. Обновите каталог и повторите: повтор не создаст второй товар.", 503);
  }
}
