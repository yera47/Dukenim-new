"use client";
import {useActionState,useState} from "react";
import {applyStaffDesign} from "./actions";
export function StaffDesignApply({access,generation,expected}:{access:string;generation:string;expected:string}){
 const[state,action,pending]=useActionState(applyStaffDesign,{}),[preview,setPreview]=useState(false);
 return <div className="space-y-3"><button type="button" onClick={()=>setPreview(!preview)} className="btn btn-secondary">{preview?"Скрыть предпросмотр":"Посмотреть оформление"}</button>{preview&&<><iframe title="Предпросмотр оформления магазина" src={`/store-preview?access=${access}&generation=${generation}`} className="h-[560px] w-full rounded-xl border"/><form action={action}><input type="hidden" name="p_access" value={access}/><input type="hidden" name="p_generation" value={generation}/><input type="hidden" name="p_expected" value={expected}/><p className="mb-3 text-sm">Если магазин уже опубликован, изменения увидят покупатели. Товары, оплата и статус публикации не меняются.</p><button disabled={pending} className="btn btn-primary">{pending?"Сохраняем…":"Подтвердить оформление"}</button></form></>}{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}</div>;
}
