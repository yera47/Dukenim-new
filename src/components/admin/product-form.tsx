"use client";

import { useActionState, useEffect, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { createProductAction, type ProductActionState } from "@/app/admin/actions";

const initialState: ProductActionState = {};
type PhotoPreview = { name: string; url: string };

export function ProductForm() {
  const [state, action, pending] = useActionState(createProductAction, initialState);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [color, setColor] = useState("");

  useEffect(() => () => photos.forEach((photo) => URL.revokeObjectURL(photo.url)), [photos]);
  const choosePhotos = (files: FileList | null) => {
    const next = Array.from(files ?? []).slice(0, 4).map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setPhotos((previous) => {
      previous.forEach((photo) => URL.revokeObjectURL(photo.url));
      return next;
    });
  };

  return <form action={action} className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <section className="card space-y-6 p-6"><label className="block text-sm font-bold">Название<input name="title" required minLength={2} maxLength={120} onChange={(event) => setTitle(event.target.value)} className="input mt-2" placeholder="Например, Жакет Essential" /></label><label className="block text-sm font-bold">Описание<textarea name="description" maxLength={2000} className="input mt-2 min-h-32 py-3" placeholder="Материал, посадка, особенности" /></label><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Цена, ₸<input name="price" required min={0} step={1} onChange={(event) => setPrice(event.target.value)} className="input mt-2" type="number" /></label><label className="text-sm font-bold">Старая цена, ₸<input name="oldPrice" min={0} step={1} className="input mt-2" type="number" /></label></div><div><b>Размеры и начальные остатки</b><p className="muted mt-1 text-sm">Без размеров оставьте первую строку пустой.</p><div className="mt-3 space-y-2">{[0, 1, 2].map((item) => <div key={item} className="grid grid-cols-4 gap-2"><input name="size" className="input" placeholder="Размер" /><input name="color" onChange={item === 0 ? (event) => setColor(event.target.value) : undefined} className="input" placeholder="Цвет" /><input name="sku" className="input" placeholder="SKU" /><input name="stock" min={0} defaultValue={0} step={1} className="input" type="number" aria-label="Остаток" /></div>)}</div></div></section>
    <aside className="space-y-5"><div className="card p-6"><div className="flex items-baseline justify-between gap-3"><b>Фотографии</b><span className="text-xs text-[var(--ink-60)]">До 4 · до 5 МБ</span></div><label className="mt-4 flex min-h-28 cursor-pointer items-center gap-4 rounded-[14px] border border-dashed border-[var(--line)] bg-[var(--surface-muted)] p-4 text-[var(--ink-60)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[var(--accent)] shadow-sm"><ImagePlus size={20} /></span><span><b className="block text-sm text-[var(--ink)]">Выберите фотографии</b><small className="mt-1 block">JPEG, PNG или WebP</small></span><input name="images" accept="image/jpeg,image/png,image/webp" multiple type="file" onChange={(event) => choosePhotos(event.target.files)} className="hidden" /></label>{photos.length > 0 && <div className="mt-4 grid grid-cols-4 gap-2" aria-live="polite">{photos.map((photo, index) => <figure key={photo.url} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-muted)]"><img src={photo.url} alt={`Выбранное фото ${index + 1}: ${photo.name}`} className="size-full object-cover" /><figcaption className="sr-only">{photo.name}</figcaption>{index === 0 && <span className="absolute bottom-1 left-1 rounded bg-[var(--accent-dark)] px-1.5 py-0.5 text-[10px] font-bold text-white">Обложка</span>}</figure>)}</div>}</div>
      <div className="card p-6"><div className="flex items-center justify-between gap-4"><div><b>Как увидит покупатель</b><small className="muted mt-1 block">Превью карточки каталога</small></div><span className="size-3 shrink-0 rounded-full bg-[var(--tenant-accent)]" title={color || "Цвет товара"} /></div><div className="mt-4 grid grid-cols-[84px_minmax(0,1fr)] gap-3"><div className="product-image aspect-[4/5] rounded-xl" style={photos[0] ? { backgroundImage: `url(${photos[0].url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} /><div className="min-w-0 py-1"><b className="block truncate text-sm">{title || "Название товара"}</b><p className="mt-2 text-sm font-extrabold tabular">{price ? `${new Intl.NumberFormat("ru-KZ").format(Number(price))} ₸` : "Цена"}</p><p className="mt-2 truncate text-xs text-[var(--ink-60)]">{color || "Цвет будет указан здесь"}</p></div></div><p className="mt-4 text-xs leading-5 text-[var(--ink-60)]">Оформление и палитру самой витрины владелец выбирает в настройках каталога.</p></div>
      <div className="card p-6"><label className="flex justify-between gap-4"><span><b>Показывать на витрине</b><small className="muted block">Сразу после сохранения</small></span><input name="isActive" type="checkbox" defaultChecked /></label>{state.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{state.error}</p>}<button disabled={pending} className="btn btn-primary mt-6 w-full">{pending ? <><LoaderCircle className="animate-spin" size={18} />Сохраняем…</> : "Сохранить товар"}</button></div></aside>
  </form>;
}
