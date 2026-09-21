"use client";
import {useState} from "react";

export function QuantityStepper({name,initial=0,min=0,max=9999,label}:{name:string;initial?:number;min?:number;max?:number;label:string}){
 const[value,setValue]=useState(initial);
 return <div className="flex h-11 items-center overflow-hidden rounded-xl border bg-white" role="group" aria-label={label}>
  <button type="button" aria-label={`Уменьшить ${label.toLowerCase()}`} disabled={value<=min} className="h-full min-w-10 border-r text-lg disabled:opacity-30" onClick={()=>setValue(Math.max(min,value-1))}>−</button>
  <output className="min-w-10 flex-1 text-center font-semibold" aria-live="polite">{value}</output>
  <button type="button" aria-label={`Увеличить ${label.toLowerCase()}`} disabled={value>=max} className="h-full min-w-10 border-l text-lg disabled:opacity-30" onClick={()=>setValue(Math.min(max,value+1))}>+</button>
  <input type="hidden" name={name} value={value}/>
 </div>;
}
