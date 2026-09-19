"use client";
import {useState} from "react";
import {ArrowRight} from "lucide-react";

export function CrmSetupPayment({chargeId}:{chargeId:string}){
  const[pending,setPending]=useState(false),[error,setError]=useState("");
  async function pay(){
    if(pending)return;setPending(true);setError("");
    try{const response=await fetch("/api/polar/crm-setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chargeId})});const data=await response.json();if(!response.ok||typeof data.url!=="string")throw new Error(data.error??"Не удалось открыть оплату.");window.location.assign(data.url);}
    catch(cause){setError(cause instanceof Error?cause.message:"Не удалось открыть оплату.");setPending(false);}
  }
  return <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><b>Подключение проверено · к оплате 70 000 ₸</b><p className="mt-1 text-sm">Разовый платёж за настройку на тарифе «Старт». Лицензия поставщика оплачивается отдельно.</p><button type="button" className="btn btn-cta mt-3" disabled={pending} onClick={pay}>{pending?"Открываем оплату…":"Оплатить 70 000 ₸"}<ArrowRight size={16}/></button>{error&&<p role="alert" className="mt-2 text-sm">{error}</p>}</div>;
}
