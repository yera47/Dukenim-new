"use client";
import {useState} from "react";
export function StaffProductCreate({access,stock}:{access:string;stock:boolean}){
 const[pending,setPending]=useState(false),[message,setMessage]=useState("");
 return <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-semibold">Добавить товар с фотографиями</summary><form className="mt-4 space-y-3" onSubmit={async event=>{event.preventDefault();if(pending)return;const form=event.currentTarget;setPending(true);setMessage("");try{const data=new FormData(form);data.set("access",access);data.set("request",form.dataset.request??(form.dataset.request=crypto.randomUUID()));const response=await fetch("/api/staff/products",{method:"POST",body:data});const result=await response.json();if(!response.ok)throw new Error(result.error??"Не удалось сохранить");setMessage("Товар сохранён скрытым. Обновите список, проверьте карточку и включите показ покупателям.");form.reset();delete form.dataset.request;}catch(error){setMessage(error instanceof Error?error.message:"Не удалось сохранить. Повторите попытку.");}finally{setPending(false);}}}>
 <label className="block">Название<input required minLength={2} maxLength={200} name="title" className="input"/></label>
 <label className="block">Описание<textarea name="description" maxLength={4000} className="input"/></label>
 <label className="block">Цена, ₸<input required name="price" type="number" min={0} max={2000000000} step={1} className="input"/></label>
 {stock?<label className="block">Начальный остаток<input required name="stock" type="number" defaultValue={0} min={0} max={1000000} step={1} className="input"/></label>:<><input type="hidden" name="stock" value="0"/><p className="text-sm">Остаток заполнит владелец или сотрудник с правами склада.</p></>}
 <label className="block">Фотографии<input name="images" type="file" multiple accept="image/jpeg,image/png,image/webp" className="block mt-2"/></label><p className="text-sm text-neutral-500">До 4 фотографий JPEG, PNG или WebP. Суммарно до 3 МБ. Товар сначала сохраняется скрытым.</p>
 <button disabled={pending} className="btn btn-primary">{pending?"Сохраняем…":"Сохранить товар"}</button><p role="status">{message}</p></form></details>;
}
