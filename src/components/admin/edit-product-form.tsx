"use client";
import {useActionState} from "react";
import {updateProductAction,type ProductActionState} from "@/app/admin/actions";
import type {ProductRow,VariantRow} from "@/types/database";
import {FoodOptionsEditor} from "./food-options-editor";
import {QuantityStepper} from "./quantity-stepper";

export function EditProductForm({product,variants,choices,food}:{product:ProductRow;variants:VariantRow[];choices:{id:string;label:string}[];food:boolean}){
 const[state,action,pending]=useActionState(updateProductAction,{} as ProductActionState);
 return <form action={action} className="card mt-7 max-w-4xl space-y-6 p-6"><input type="hidden" name="productId" value={product.id}/>
  <label className="block text-sm font-bold">Название<input name="title" required minLength={2} maxLength={120} defaultValue={product.title} className="input mt-2"/></label>
  <label className="block text-sm font-bold">Описание<textarea name="description" maxLength={2000} defaultValue={product.description??""} className="input mt-2 min-h-28 py-3"/></label>
  <div className="grid gap-4 md:grid-cols-2">{([['price','Цена',product.price],['oldPrice','Старая цена',product.old_price??'']] as const).map(([name,label,initial])=><label key={name} className="block text-sm font-bold">{label}<span className="relative mt-2 block"><input name={name} type="number" inputMode="numeric" min={0} step={1} required={name==='price'} defaultValue={initial} className="input pr-12"/><span className="pointer-events-none absolute right-4 top-3">₸</span></span></label>)}</div>
  <section><b>Варианты и остатки</b><p className="mt-1 text-sm text-neutral-500">Количество меняется кнопками. Переход с 0 на 1 сразу включает наличие товара.</p><div className="mt-3 space-y-3">{variants.map((v,index)=><div key={v.id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-4"><input type="hidden" name="variantId" value={v.id}/><input type="hidden" name="currentStock" value={v.stock_qty}/><input name="size" defaultValue={v.size??""} className="input" placeholder="Размер" aria-label={`Размер варианта ${index+1}`}/><input name="color" defaultValue={v.color??""} className="input" placeholder="Цвет" aria-label={`Цвет варианта ${index+1}`}/><input name="sku" defaultValue={v.sku??""} className="input" placeholder="SKU" aria-label={`Артикул варианта ${index+1}`}/><QuantityStepper name="stock" initial={v.stock_qty} max={1000000} label={`Остаток варианта ${index+1}`}/></div>)}</div></section>
  {food&&<FoodOptionsEditor initial={product.food_options} choices={choices}/>}
  <label className="flex gap-3"><input name="isActive" type="checkbox" defaultChecked={product.is_active}/><b>Показывать на витрине</b></label>
  {state.error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
  <button disabled={pending} className="btn btn-primary">{pending?"Сохраняем…":"Сохранить изменения"}</button>
 </form>;
}
