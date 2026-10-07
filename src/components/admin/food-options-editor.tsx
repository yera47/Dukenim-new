"use client";

import { useState } from "react";
import { CircleHelp, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { readFoodOptions, type FoodOptions } from "@/lib/food-options";

type Choice = { id: string; label: string };
type Group = FoodOptions["groups"][number];

export function parseNumericDraft(raw: string, { integer = false, max }: { integer?: boolean; max: number }) {
  const normalized = raw.replace(",", ".");
  if (normalized === "" || normalized === ".") return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(max, Math.max(0, integer ? Math.trunc(parsed) : parsed));
}

function NumericDraftInput({ value, onValueChange, integer = false, max, blankZero = false, className = "input mt-1" }: { value: number; onValueChange: (value: number) => void; integer?: boolean; max: number; blankZero?: boolean; className?: string }) {
  const [draft, setDraft] = useState(() => blankZero && value === 0 ? "" : String(value));
  const parse = (raw: string) => parseNumericDraft(raw, { integer, max });
  return <input className={className} type="text" inputMode={integer ? "numeric" : "decimal"} value={draft} onFocus={event=>{if(draft==="0")event.currentTarget.select();}} onChange={event => {
    const raw = event.target.value;
    if (!/^\d*(?:[.,]\d*)?$/.test(raw)) return;
    setDraft(raw);
    onValueChange(parse(raw));
  }} onBlur={() => {
    const next = parse(draft);
    setDraft(String(next));
    onValueChange(next);
  }} />;
}

export function FoodOptionsEditor({ initial, choices = [] }: { initial?: unknown; choices?: Choice[] }) {
  const [value, setValue] = useState<FoodOptions>(() => readFoodOptions(initial));
  const [expanded, setExpanded] = useState(Boolean(value.ingredients.length || value.groups.length));
  const [comboMessage, setComboMessage] = useState("");
  const uid = () => crypto.randomUUID();
  const groupChange = (index: number, patch: Partial<Group>) => setValue(current => ({ ...current, groups: current.groups.map((group, item) => item === index ? { ...group, ...patch } : group) }));
  const addGroup = (kind: Group["kind"]) => {
    if (kind === "combo" && choices.length === 0) {
      setComboMessage("Сначала сохраните этот товар и добавьте хотя бы ещё один активный товар с остатком. Черновик на этом экране останется без изменений.");
      return;
    }
    setComboMessage("");
    setValue(current => ({ ...current, groups: [...current.groups, { id: uid(), title: kind === "combo" ? "Выбор напитка" : "Добавки", kind, min: kind === "combo" ? 1 : 0, max: kind === "combo" ? 1 : 3, options: [{ id: uid(), label: "", price: 0, variantId: null }] }] }));
  };

  return <section data-food-options-editor className="rounded-2xl border border-purple-100 bg-[#faf8fe] p-5">
    <input type="hidden" name="foodOptions" value={JSON.stringify(value)} />
    <button type="button" onClick={() => setExpanded(current => !current)} className="flex w-full items-center gap-3 text-left"><UtensilsCrossed size={21} className="text-purple-600" /><span className="flex-1"><b className="block">Состав, пищевая ценность и выбор</b><small className="mt-1 block text-neutral-500">Дополнительно — соберите блюдо под своё меню</small></span><span>{expanded ? "−" : "+"}</span></button>
    {expanded && <div className="mt-6 space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-4"><h3 className="font-semibold">Вес и КБЖУ — необязательно</h3><p className="mt-1 text-xs text-neutral-500">Покажем на витрине после сохранения товара.</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">{([['weightGrams', 'Вес, г'], ['kcal', 'Ккал'], ['protein', 'Белки, г'], ['fat', 'Жиры, г'], ['carbs', 'Углеводы, г']] as const).map(([key, label]) => <label key={key} className="text-xs">{label}<NumericDraftInput value={value.nutrition?.[key] ?? 0} blankZero={!value.nutrition} integer={key === 'weightGrams' || key === 'kcal'} max={key === 'weightGrams' || key === 'kcal' ? 100000 : 10000} onValueChange={number => setValue(current => ({ ...current, nutrition: { weightGrams: 0, kcal: 0, protein: 0, fat: 0, carbs: 0, ...current.nutrition, [key]: number } }))} /></label>)}</div></section>

      <div><h3 className="font-semibold">Что входит в блюдо</h3><p className="mt-1 text-xs leading-6 text-neutral-500">Добавьте ингредиенты отдельно. Отметьте, какие можно убрать бесплатно.</p><div className="mt-3 space-y-2">{value.ingredients.map((ingredient, index) => <div key={ingredient.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3"><input aria-label={`Ингредиент ${index + 1}`} className="input min-w-0 flex-1 basis-36" value={ingredient.name} maxLength={60} placeholder="Например, томаты" onChange={event => setValue(current => ({ ...current, ingredients: current.ingredients.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} /><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={ingredient.removable} onChange={event => setValue(current => ({ ...current, ingredients: current.ingredients.map((item, itemIndex) => itemIndex === index ? { ...item, removable: event.target.checked } : item) }))} />Можно убрать</label><button type="button" aria-label={`Удалить ингредиент ${index + 1}`} className="p-2 text-neutral-400" onClick={() => setValue(current => ({ ...current, ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={16} /></button></div>)}</div>{value.ingredients.length < 30 && <button type="button" className="mt-3 flex items-center gap-2 text-sm text-purple-700" onClick={() => setValue(current => ({ ...current, ingredients: [...current.ingredients, { id: uid(), name: "", removable: true }] }))}><Plus size={15} />Добавить ингредиент</button>}</div>

      {value.groups.map((group, index) => <section key={group.id} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><b>{group.kind === "combo" ? "Часть комбо" : "Добавки к блюду"}</b><button type="button" aria-label={`Удалить группу ${index + 1}`} className="p-2 text-neutral-400" onClick={() => setValue(current => ({ ...current, groups: current.groups.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={17} /></button></div><label className="block text-xs">Название группы<input className="input mt-2" maxLength={80} value={group.title} placeholder={group.kind === "combo" ? "Выберите напиток" : "Добавки к блюду"} onChange={event => groupChange(index, { title: event.target.value })} /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs">Минимум вариантов<select className="input mt-2" value={group.min} onChange={event => groupChange(index, { min: Number(event.target.value) })}>{Array.from({ length: 11 }, (_, number) => <option key={number} value={number}>{number}</option>)}</select></label><label className="text-xs">Максимум вариантов<select className="input mt-2" value={group.max} onChange={event => groupChange(index, { max: Number(event.target.value) })}>{Array.from({ length: 10 }, (_, number) => <option key={number + 1} value={number + 1}>{number + 1}</option>)}</select></label></div>
        {group.options.map((option, optionIndex) => <div key={option.id} className="grid grid-cols-[minmax(0,1fr)_90px_32px] items-end gap-2 rounded-xl bg-neutral-50 p-3"><label className="min-w-0 text-xs">{group.kind === "combo" ? "Товар из меню" : "Название добавки"}{group.kind === "combo" ? <select className="input mt-2" value={option.variantId ?? ""} onChange={event => groupChange(index, { options: group.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, variantId: event.target.value || null, label: choices.find(choice => choice.id === event.target.value)?.label ?? "" } : item) })}><option value="">Выберите товар</option>{choices.map(choice => <option value={choice.id} key={choice.id}>{choice.label}</option>)}</select> : <input className="input mt-2" maxLength={80} value={option.label} placeholder="Сыр" onChange={event => groupChange(index, { options: group.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, label: event.target.value } : item) })} />}</label><label className="text-xs">Доплата, ₸<NumericDraftInput className="input mt-2" value={option.price} max={1000000} integer onValueChange={price => groupChange(index, { options: group.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, price } : item) })} /></label><button type="button" aria-label={`Удалить вариант ${optionIndex + 1}`} className="h-11 text-neutral-400" onClick={() => groupChange(index, { options: group.options.filter((_, itemIndex) => itemIndex !== optionIndex) })}><Trash2 size={15} /></button></div>)}
        {group.options.length < 20 && <button type="button" className="flex items-center gap-2 text-xs text-purple-700" onClick={() => groupChange(index, { options: [...group.options, { id: uid(), label: "", price: 0, variantId: null }] })}><Plus size={14} />Добавить вариант</button>}
      </section>)}

      {value.groups.length < 8 && <div className="flex flex-wrap items-center gap-3"><button type="button" className="btn btn-secondary text-sm" onClick={() => addGroup("addon")}><Plus size={15} />Добавить группу добавок</button><span className="inline-flex items-center gap-2"><button type="button" className="btn btn-secondary text-sm" aria-disabled={choices.length === 0} onClick={() => addGroup("combo")}><Plus size={15} />Добавить часть комбо</button><span title={choices.length ? "Выберите готовый товар меню, чтобы он вошёл в комбо." : "Для комбо нужен хотя бы один другой активный товар с остатком."} tabIndex={0} className="cursor-help text-neutral-500"><CircleHelp size={18} /></span></span></div>}
      {comboMessage && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{comboMessage}</p>}
      <p className="text-xs leading-6 text-neutral-500">Цена блюда — основная цена. Добавки прибавляются к ней. Части комбо списываются через варианты связанных товаров.</p>
    </div>}
  </section>;
}
