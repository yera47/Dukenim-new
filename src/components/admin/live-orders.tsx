"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
export function LiveOrders(){const router=useRouter();useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState!=="visible"||/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName??""))return;router.refresh();},15000);return()=>clearInterval(timer);},[router]);return <p className="text-xs text-neutral-500">Список обновляется каждые 15 секунд, пока вы не редактируете данные.</p>;}
