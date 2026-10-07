import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tenantEntitlement } from "@/lib/plan-access";
import { brandColorsSchema, brandNotesSchema } from "@/lib/brand-materials";
import { prepareBrandLogo } from "@/lib/brand-image";
import { brandThemeFromColors } from "@/lib/brand-palette";
import { ownedLogoPath } from "@/lib/logo-storage";

export const runtime = "nodejs";
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function GET() {
  const session = await getSessionContext();
  if (!session?.user || !session.tenantId || session.role !== "owner") return fail("Нужен доступ владельца магазина.", 401);
  const client = await createClient();
  const result = await client.from("tenant_brand_materials").select("revision,notes,logo_path,colors").eq("tenant_id", session.tenantId).maybeSingle();
  if (result.error) return fail("Материалы не загрузились.", 503);
  let logoUrl: string | null = null;
  if (result.data?.logo_path?.startsWith(`${session.tenantId}/`)) {
    const signed = await client.storage.from("brand-materials").createSignedUrl(result.data.logo_path, 600);
    if (signed.error) return fail("Не удалось загрузить логотип.", 503);
    logoUrl = signed.data.signedUrl;
  }
  const colors=brandColorsSchema.parse(result.data?.colors??[]);
  return NextResponse.json({ revision: result.data?.revision ?? 0, notes: result.data?.notes ?? "", colors, logoUrl, colorTheme:brandThemeFromColors(colors) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    if (!session?.user || !session.tenantId || session.role !== "owner") return fail("Нужен доступ владельца магазина.", 401);
    if (!(await tenantEntitlement(session.tenantId)).active) return fail("Подписка или пробный период завершены.", 403);
    const reader = request.body?.getReader();
    if (!reader) return fail("Нет данных для сохранения.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4 * 1024 * 1024) { await reader.cancel(); return fail("Файл слишком большой. Максимум 3 МБ.", 413); }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    const form = await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") ?? "" }, body: bytes }).formData();
    const input = brandNotesSchema.safeParse({ revision: Number(form.get("revision")), notes: String(form.get("notes") ?? "") });
    if (!input.success || form.get("revision") === null) return fail("Проверьте текст правил и повторите сохранение.", 400);

    const client = await createClient();
    const [current, tenant] = await Promise.all([
      client.from("tenant_brand_materials").select("revision,logo_path,colors").eq("tenant_id", session.tenantId).maybeSingle(),
      client.from("tenants").select("logo_url").eq("id", session.tenantId).maybeSingle(),
    ]);
    if (current.error || tenant.error || !tenant.data) return fail("Не удалось проверить текущие материалы.", 503);
    if ((current.data?.revision ?? 0) !== input.data.revision) return fail("Материалы изменены в другой вкладке. Обновите страницу.", 409);

    let logoPath = current.data?.logo_path ?? null;
    let colors = brandColorsSchema.parse(current.data?.colors ?? []);
    let publicLogoUrl = tenant.data.logo_url as string | null;
    let newPrivatePath: string | null = null;
    let newPublicPath: string | null = null;
    const file = form.get("logo");
    if (file instanceof File && file.size) {
      if (file.size > 3 * 1024 * 1024) return fail("Логотип должен быть меньше 3 МБ.", 413);
      let prepared: Awaited<ReturnType<typeof prepareBrandLogo>>;
      try { prepared = await prepareBrandLogo(Buffer.from(await file.arrayBuffer())); }
      catch { return fail("Используйте PNG, JPEG или WebP до 16 мегапикселей.", 400); }
      newPrivatePath = `${session.tenantId}/${crypto.randomUUID()}.png`;
      const privateUpload = await client.storage.from("brand-materials").upload(newPrivatePath, prepared.png, { contentType: "image/png", upsert: false });
      if (privateUpload.error) return fail("Логотип не загрузился. Материалы не изменены.", 503);
      newPublicPath = `${session.tenantId}/logo-${crypto.randomUUID()}.png`;
      const publicBucket = client.storage.from("product-images");
      const publicUpload = await publicBucket.upload(newPublicPath, prepared.png, { contentType: "image/png", upsert: false });
      if (publicUpload.error) { await client.storage.from("brand-materials").remove([newPrivatePath]); return fail("Логотип не загрузился на витрину. Материалы не изменены.", 503); }
      logoPath = newPrivatePath;
      publicLogoUrl = publicBucket.getPublicUrl(newPublicPath).data.publicUrl;
      colors = prepared.colors;
    }

    const value = { notes: input.data.notes, logo_path: logoPath, colors, revision: input.data.revision + 1, updated_at: new Date().toISOString() };
    const saved = input.data.revision === 0
      ? await client.from("tenant_brand_materials").insert({ tenant_id: session.tenantId, ...value }).select("revision").single()
      : await client.from("tenant_brand_materials").update(value).eq("tenant_id", session.tenantId).eq("revision", input.data.revision).select("revision").maybeSingle();
    if (saved.error || !saved.data) {
      if (newPrivatePath) await client.storage.from("brand-materials").remove([newPrivatePath]);
      if (newPublicPath) await client.storage.from("product-images").remove([newPublicPath]);
      return fail("Сохранение не подтвердилось. Обновите страницу перед повтором.", 409);
    }

    const colorTheme = brandThemeFromColors(colors);
    if (newPublicPath && publicLogoUrl) {
      const logoSaved = await client.from("tenants").update({ logo_url: publicLogoUrl }).eq("id", session.tenantId).select("id").maybeSingle();
      if (logoSaved.error || !logoSaved.data) { await client.storage.from("product-images").remove([newPublicPath]); return fail("Материалы сохранены, но логотип витрины не обновился. Повторите загрузку.", 503); }
      await client.from("tenant_storefront_settings").update({ color_theme: colorTheme, brand_color: colorTheme.accent }).eq("tenant_id", session.tenantId);
      const previousPath = ownedLogoPath(tenant.data.logo_url, session.tenantId);
      if (previousPath && previousPath !== newPublicPath) await client.storage.from("product-images").remove([previousPath]);
      revalidatePath("/s/[slug]", "page");
    }
    return NextResponse.json({ revision: saved.data.revision, colors, logoUrl: publicLogoUrl, colorTheme });
  } catch {
    return fail("Не удалось сохранить материалы. Поля и файл остались на экране.", 503);
  }
}
