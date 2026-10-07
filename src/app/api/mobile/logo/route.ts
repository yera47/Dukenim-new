import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMobileOwner } from "@/lib/mobile-auth";
import { prepareBrandLogo } from "@/lib/brand-image";
import { brandThemeFromColors } from "@/lib/brand-palette";
import { ownedLogoPath } from "@/lib/logo-storage";

export const runtime = "nodejs";
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
const maxSize = 3 * 1024 * 1024;
export async function POST(request: Request) {
  if (!/^Bearer\s+.{20,}$/i.test(request.headers.get("authorization") ?? "")) return fail("Войдите как владелец магазина.", 401);
  if (Number(request.headers.get("content-length") || 0) > maxSize + 50_000) return fail("Логотип должен быть меньше 3 МБ.", 413);
  let form: FormData;
  try {
    const reader = request.body?.getReader();
    if (!reader) return fail("Не удалось прочитать изображение.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxSize + 50_000) { await reader.cancel(); return fail("Логотип должен быть меньше 3 МБ.", 413); }
      chunks.push(value);
    }
    form = await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") ?? "" }, body: Buffer.concat(chunks) }).formData();
  } catch { return fail("Не удалось прочитать изображение.", 400); }
  const tenantId = z.string().uuid().safeParse(form.get("tenantId"));
  if (!tenantId.success) return fail("Выберите магазин.", 400);
  const context = await getMobileOwner(request, tenantId.data);
  if (!context) return fail("Войдите как владелец магазина.", 401);
  const previous=await context.admin.from("tenants").select("logo_url").eq("id",context.tenantId).maybeSingle();
  if(previous.error||!previous.data)return fail("Не удалось прочитать текущий логотип.",503);
  const file = form.get("logo");
  if (!(file instanceof File) || !file.size || file.size > maxSize) return fail("Выберите PNG, JPEG или WebP до 3 МБ.", 400);
  let prepared: Awaited<ReturnType<typeof prepareBrandLogo>>;
  try { prepared = await prepareBrandLogo(Buffer.from(await file.arrayBuffer())); }
  catch { return fail("Используйте PNG, JPEG или WebP до 16 мегапикселей.", 400); }
  const path = `${context.tenantId}/logo-${crypto.randomUUID()}.png`;
  const bucket = context.admin.storage.from("product-images");
  const uploaded = await bucket.upload(path, prepared.png, { contentType: "image/png", upsert: false });
  if (uploaded.error) return fail("Логотип не загрузился.", 503);
  const logoUrl = bucket.getPublicUrl(path).data.publicUrl;
  const saved = await context.admin.from("tenants").update({ logo_url: logoUrl }).eq("id", context.tenantId).select("id").maybeSingle();
  if (saved.error || !saved.data) {
    await bucket.remove([path]);
    return fail("Не удалось сохранить логотип магазина.", 503);
  }
  const previousPath=ownedLogoPath(previous.data.logo_url,context.tenantId);
  if(previousPath&&previousPath!==path)await bucket.remove([previousPath]);
  revalidatePath("/s/[slug]", "page");
  return NextResponse.json({ logoUrl, palette: prepared.colors, colorTheme: brandThemeFromColors(prepared.colors) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request:Request){
  if (!/^Bearer\s+.{20,}$/i.test(request.headers.get("authorization") ?? "")) return fail("Войдите как владелец магазина.", 401);
  const tenantId=z.string().uuid().safeParse(new URL(request.url).searchParams.get("tenantId"));
  if(!tenantId.success)return fail("Выберите магазин.",400);
  const context=await getMobileOwner(request,tenantId.data);
  if(!context)return fail("Войдите как владелец магазина.",401);
  const current=await context.admin.from("tenants").select("logo_url").eq("id",context.tenantId).maybeSingle();
  if(current.error||!current.data)return fail("Не удалось прочитать текущий логотип.",503);
  const cleared=await context.admin.from("tenants").update({logo_url:null}).eq("id",context.tenantId).select("id").maybeSingle();
  if(cleared.error||!cleared.data)return fail("Не удалось удалить логотип.",503);
  const path=ownedLogoPath(current.data.logo_url,context.tenantId);
  if(path)await context.admin.storage.from("product-images").remove([path]);
  revalidatePath("/s/[slug]","page");
  return NextResponse.json({logoUrl:null},{headers:{"Cache-Control":"private, no-store"}});
}
