"use client";

import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, Images, Maximize2, Minimize2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteFoodStory, saveFoodStory } from "./actions";
import { CartProvider } from "@/components/store/cart-provider";
import { StoreHeader } from "@/components/store/store-header";
import { StoreHome } from "@/components/store/store-home";
import type { CommerceApproach } from "@/lib/commerce-configurations";
import type { Product } from "@/lib/demo-data";
import type { StoreStory } from "@/lib/food-stories";
import type { BusinessVertical, Database } from "@/types/database";

export type EditorStory = { id: string; title: string; caption: string | null; media_path: string; media_type: "image" | "video"; product_id: string | null; status: "draft" | "published"; sort_order: number; url: string };
type PreviewSettings = Database["public"]["Tables"]["tenant_storefront_settings"]["Row"];

export function StoryEditor({ tenantId, stories, products, storeName, storeTagline, storeLogoUrl, businessVertical, approach, previewStyle, previewSettings }: { tenantId: string; stories: EditorStory[]; products: Product[]; storeName: string; storeTagline?: string | null; storeLogoUrl?: string | null; businessVertical: BusinessVertical; approach: CommerceApproach; previewStyle: CSSProperties; previewSettings: PreviewSettings | null }) {
  const [editing, setEditing] = useState<EditorStory | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const editor = useRef<HTMLElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [productId, setProductId] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [message, setMessage] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [fullPreview, setFullPreview] = useState(false);
  const [previewScrolled, setPreviewScrolled] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => { if (!file) { setFilePreview(null); return; } const url = URL.createObjectURL(file); setFilePreview(url); return () => URL.revokeObjectURL(url); }, [file]);

  function select(item: EditorStory | null) {
    setEditing(item); setFile(null); setTitle(item?.title ?? ""); setCaption(item?.caption ?? "");
    if (fileInput.current) fileInput.current.value = "";
    setProductId(item?.product_id ?? ""); setStatus(item?.status ?? "draft"); setMessage(""); setConfirmDelete(false); setConfirmPublish(false);
    if (window.innerWidth < 1024) requestAnimationFrame(() => editor.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function save() {
    if (status === "published" && !confirmPublish) { setConfirmPublish(true); return; }
    setMessage("");
    startTransition(async () => {
      let mediaPath = editing?.media_path ?? "";
      let mediaType = editing?.media_type ?? "image";
      if (file) {
        const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : null;
        if (!kind || !["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"].includes(file.type) || file.size > 20 * 1024 * 1024) {
          setMessage("Выберите JPG, PNG, WebP, MP4 или WebM до 20 МБ."); return;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || (kind === "video" ? "mp4" : "jpg");
        mediaPath = `${tenantId}/${crypto.randomUUID()}.${ext}`;
        const result = await createClient().storage.from("food-stories").upload(mediaPath, file, { contentType: file.type, upsert: false });
        if (result.error) { setMessage("Не удалось загрузить файл. Проверьте соединение и размер."); return; }
        mediaType = kind;
      }
      if (!mediaPath) { setMessage("Сначала выберите фото или видео."); return; }
      const result = await saveFoodStory({ id: editing?.id, title, caption, mediaPath, mediaType, productId: productId || null, status, sortOrder: editing?.sort_order ?? stories.length });
      if (result.error) { if (file) await createClient().storage.from("food-stories").remove([mediaPath]); setMessage(result.error); return; }
      select(null); setMessage(status === "published" ? "История опубликована." : "Черновик сохранён."); router.refresh();
    });
  }

  const previewUrl=filePreview??editing?.url??null;
  const previewStory=previewUrl&&title.trim()?{id:editing?.id??"story-preview",title:title.trim(),caption:caption.trim()||null,mediaUrl:previewUrl,mediaType:(file?.type.startsWith("video/")?"video":editing?.media_type??"image") as "image"|"video",productId:productId||null}:null;
  const publishedStories:StoreStory[]=stories.filter(item=>item.status==="published").map(item=>({id:item.id,title:item.title,caption:item.caption,mediaUrl:item.url,mediaType:item.media_type,productId:item.product_id}));
  const previewStories=previewStory?[previewStory,...publishedStories.filter(item=>item.id!==previewStory.id)]:publishedStories;
  function remove(item: EditorStory) {
    startTransition(async () => {
      const result = await deleteFoodStory(item.id);
      if (!result.error) select(null);
      setMessage(result.error ?? "История удалена.");
      router.refresh();
    });
  }

  return <div className={`grid gap-6 ${stories.length ? "max-w-6xl" : "max-w-4xl"}`}>
    {stories.length > 0 && <section className="space-y-3" aria-label="Сохранённые истории">
      <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Ваши истории</h2><button className="btn btn-primary" onClick={() => select(null)}>+ Новая история</button></div>
      {stories.map(item => <button type="button" key={item.id} onClick={() => select(item)} className={`flex w-full items-center gap-4 rounded-2xl border bg-white p-3 text-left ${editing?.id === item.id ? "border-[var(--accent)]" : "border-[var(--line)]"}`}>
        {item.media_type === "image" ? <Image unoptimized width={160} height={192} src={item.url} alt="" className="h-24 w-20 rounded-xl object-cover" /> : <video src={item.url} muted preload="metadata" className="h-24 w-20 rounded-xl object-cover" />}
        <span className="min-w-0"><b className="block truncate">{item.title}</b><small className="mt-1 block text-[var(--ink-60)]">{item.status === "published" ? "На витрине" : "Черновик"}{item.product_id ? " · ссылка на блюдо" : ""}</small></span>
        <span className="ml-auto text-sm font-bold text-[var(--accent)]">Изменить</span>
      </button>)}
    </section>}
    <section ref={editor} className="card h-fit scroll-mt-20 p-5 sm:p-6" aria-label="Редактор истории">
      <h2 className="text-xl font-bold">{editing ? "Редактировать историю" : "Новая история"}</h2>
      <p className="muted mt-1 text-sm">Покажите блюдо, акцию или атмосферу кафе. Опубликуйте, когда всё готово.</p>
      <div className="mt-6 space-y-5">
        <div><span className="block text-sm font-bold">1. Фото или видео</span><label className="mt-2 flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-sm font-bold text-[var(--accent)]"><Images size={20}/>{file ? file.name : editing ? "Заменить фото или видео" : "Добавить фото или видео"}<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={event => setFile(event.target.files?.[0] ?? null)} className="sr-only" /></label></div>
        {(filePreview || editing) && <div className="overflow-hidden rounded-2xl bg-[#14171f]">{filePreview ? file?.type.startsWith("video/") ? <video src={filePreview} controls className="aspect-[9/12] max-h-72 w-full object-contain" /> : <Image unoptimized width={720} height={960} src={filePreview} alt="Предпросмотр" className="aspect-[9/12] max-h-72 w-full object-contain" /> : editing?.media_type === "video" ? <video src={editing.url} controls className="aspect-[9/12] max-h-72 w-full object-contain" /> : <Image unoptimized width={720} height={960} src={editing!.url} alt="Предпросмотр" className="aspect-[9/12] max-h-72 w-full object-contain" />}</div>}
        <p className="muted text-xs">Вертикальный кадр 9:16 выглядит лучше. Фото JPG/PNG/WebP или видео MP4/WebM, до 20 МБ.</p>
        <label className="block text-sm font-bold">2. Заголовок<input className="input mt-2" value={title} onChange={event => setTitle(event.target.value)} maxLength={80} placeholder="Например: Что готовим к обеду" /></label>
        <label className="block text-sm font-bold">Короткий текст · необязательно<textarea className="input mt-2 min-h-24 py-3" value={caption} onChange={event => setCaption(event.target.value)} maxLength={300} placeholder="Пара слов о блюде или предложении" /></label>
        <label className="block text-sm font-bold">3. Ссылка на блюдо · необязательно<select className="input mt-2" value={productId} onChange={event => setProductId(event.target.value)}><option value="">Без ссылки</option>{products.map(product => <option key={product.id} value={product.id}>{product.title}</option>)}</select></label>
        <label className="block text-sm font-bold">Показ на витрине<select className="input mt-2" value={status} onChange={event => setStatus(event.target.value as "draft" | "published")}><option value="draft">Черновик · виден только вам</option><option value="published">Опубликовать</option></select></label>
        <section className="overflow-hidden rounded-2xl border border-[var(--line)]" aria-label="Предпросмотр расположения истории">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3"><span className="flex items-center gap-2 text-sm font-bold"><Eye size={17}/>Живая витрина до публикации</span><small className="muted">{approach === "collection" ? "Коллекция" : approach === "assortment" ? "Ассортимент" : "Подбор"}</small></div>
          <p className="border-b border-[var(--line)] px-4 py-3 text-xs text-[var(--ink-60)]">Прокрутите витрину: черновик вставлен между реальными соседними секциями, но ещё не сохранён.</p>
          <button type="button" data-story-preview-fullscreen onClick={()=>{setPreviewScrolled(false);setFullPreview(true)}} className="mx-4 mb-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 text-xs font-bold"><Maximize2 size={16}/>Full-screen preview</button>
          <div data-story-preview-scroll onScroll={event=>setPreviewScrolled(event.currentTarget.scrollTop>70)} className={fullPreview ? "fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-white" : "max-h-[720px] overflow-y-auto overscroll-contain"} style={previewStyle}>
            {fullPreview&&<button type="button" onClick={()=>setFullPreview(false)} aria-label="Close full-screen preview" className="fixed right-3 top-3 z-[90] grid size-11 place-items-center rounded-full border border-black/10 bg-white/95 shadow-lg"><Minimize2 size={18}/></button>}
            <div data-reference-fixture="true" className={`pointer-events-none min-w-0 ${previewScrolled?"[&>header>nav]:hidden":""}`}>
              <CartProvider storageKey={`story-preview:${tenantId}`}>
                <StoreHeader slug="preview" name={storeName} logoUrl={storeLogoUrl} categories={Array.from(new Set(products.map(product=>product.category)))} food={businessVertical==="food"} quickFood={businessVertical==="food"&&approach==="assortment"}/>
                <StoreHome slug="preview" tenant={{name:storeName,catalog_name:storeName,tagline:storeTagline??null,business_vertical:businessVertical}} products={products} settings={previewSettings} campaign={null} storePolicies={null} approach={approach} foodStories={previewStories}/>
              </CartProvider>
            </div>
          </div>
        </section>
        {confirmPublish && <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4 text-sm"><div className="flex items-start justify-between gap-3"><div><b>Опубликовать именно этот вариант?</b><p className="muted mt-1">История появится в показанном месте выбранного шаблона. Отмена ничего не публикует.</p></div><button type="button" aria-label="Закрыть подтверждение" onClick={()=>setConfirmPublish(false)}><X size={18}/></button></div><div className="mt-3 flex gap-2"><button type="button" disabled={pending} onClick={save} className="btn btn-primary">Опубликовать</button><button type="button" disabled={pending} onClick={()=>setConfirmPublish(false)} className="btn btn-secondary">Отмена</button></div></div>}
        {message && <p role="status" className="rounded-xl bg-[var(--surface-2)] p-3 text-sm">{message}</p>}
        {editing && confirmDelete && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm"><p className="font-bold text-red-800">Удалить «{editing.title}»?</p><p className="mt-1 text-red-700">История и её файл исчезнут с витрины.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => remove(editing)} className="btn bg-red-700 text-white hover:bg-red-800">Да, удалить</button><button type="button" disabled={pending} onClick={() => setConfirmDelete(false)} className="btn btn-secondary">Отмена</button></div></div>}
        <div className="flex flex-wrap gap-3">{!confirmPublish && <button type="button" disabled={pending || !title.trim()} onClick={save} className="btn btn-primary">{pending ? "Сохраняем…" : editing ? "Сохранить изменения" : "Создать историю"}</button>}{editing && !confirmDelete && <button type="button" disabled={pending} onClick={() => setConfirmDelete(true)} className="btn btn-secondary text-red-700">Удалить</button>}</div>
      </div>
    </section>
  </div>;
}
