"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,Check,Loader2,Phone,ShieldCheck} from "lucide-react";
import type {User} from "@supabase/supabase-js";
import {createClient} from "@/lib/supabase/client";
import styles from "./phone-auth.module.css";

type Props={
 slug:string;
 compact?:boolean;
 onAuthenticated?:(user:User)=>void;
};

const normalize=(value:string)=>{
 const digits=value.replace(/\D/g,"").replace(/^8(?=7)/,"7").slice(0,11);
 if(!digits)return "+7";
 return `+${digits.startsWith("7")?digits:`7${digits}`}`;
};

function authMessage(message:string){
 if(/rate|seconds|minute/i.test(message))return "Новый код можно запросить через минуту.";
 if(/invalid.*phone|phone.*invalid/i.test(message))return "Проверьте номер телефона.";
 if(/token|expired|otp/i.test(message))return "Код неверный или истёк. Запросите новый.";
 return "Не удалось подтвердить номер. Попробуйте ещё раз.";
}

export function PhoneAuth({slug,compact=false,onAuthenticated}:Props){
 const client=useMemo(()=>createClient(),[]);
 const[stage,setStage]=useState<"phone"|"code"|"ready">("phone");
 const[phone,setPhone]=useState("+7");
 const[code,setCode]=useState(["","","","","",""]);
 const[consent,setConsent]=useState(false);
 const[pending,setPending]=useState(false);
 const[error,setError]=useState("");
 const[user,setUser]=useState<User|null>(null);
 const inputs=useRef<Array<HTMLInputElement|null>>([]);
 useEffect(()=>{void client.auth.getUser().then(({data})=>{if(data.user?.phone&&data.user.phone_confirmed_at){setUser(data.user);setPhone(data.user.phone);setStage("ready");}});},[client]);
 async function send(){
  if(!consent){setError("Подтвердите согласие с политикой и офертой.");return;}
  const normalized=normalize(phone);if(!/^\+7\d{10}$/.test(normalized)){setError("Введите номер в формате +7 777 000 00 00.");return;}
  setPending(true);setError("");
  const {error}=await client.auth.signInWithOtp({phone:normalized,options:{shouldCreateUser:true,data:{registration_source:"storefront",store_slug:slug}}});
  setPending(false);if(error){setError(authMessage(error.message));return;}setPhone(normalized);setStage("code");setTimeout(()=>inputs.current[0]?.focus(),30);
 }
 async function verify(next=code){
  const token=next.join("");if(token.length!==6)return;
  setPending(true);setError("");const {data,error}=await client.auth.verifyOtp({phone:normalize(phone),token,type:"sms"});setPending(false);
  if(error||!data.user){setError(authMessage(error?.message??""));return;}setUser(data.user);setStage("ready");onAuthenticated?.(data.user);
 }
 function digit(index:number,value:string){const clean=value.replace(/\D/g,"").slice(-1);const next=[...code];next[index]=clean;setCode(next);if(clean&&index<5)inputs.current[index+1]?.focus();if(next.every(Boolean))void verify(next);}
 if(stage==="ready"&&user)return <div className={styles.ready}><span><Check size={17}/></span><div><b>Телефон подтверждён</b><small>{user.phone}</small></div></div>;
 return <section className={`${styles.root} ${compact?styles.compact:""}`} aria-label="Вход покупателя по телефону">
  <div className={styles.title}><span><Phone size={20}/></span><div><b>{stage==="phone"?"Войдите по номеру телефона":"Введите код из SMS"}</b><p>{stage==="phone"?"Заказы и карта лояльности сохранятся в вашем профиле.":`Код отправлен на ${normalize(phone)}`}</p></div></div>
  {stage==="phone"?<>
   <label className={styles.phone}>Номер телефона<input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={event=>setPhone(event.target.value)} onBlur={()=>setPhone(normalize(phone))} placeholder="+7 777 000 00 00"/></label>
   <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>Соглашаюсь с <Link href="/legal/privacy" target="_blank">политикой конфиденциальности</Link> и <Link href="/legal/offer" target="_blank">публичной офертой</Link>.</span></label>
   <button type="button" className={styles.primary} disabled={pending} onClick={()=>void send()}>{pending?<Loader2 className={styles.spin} size={18}/>:<ShieldCheck size={18}/>}Получить код SMS</button>
  </>:<>
   <div className={styles.otp}>{code.map((value,index)=><input key={index} ref={node=>{inputs.current[index]=node;}} aria-label={`Цифра ${index+1}`} inputMode="numeric" autoComplete={index===0?"one-time-code":"off"} maxLength={1} value={value} onChange={event=>digit(index,event.target.value)} onKeyDown={event=>{if(event.key==="Backspace"&&!code[index]&&index>0)inputs.current[index-1]?.focus();}}/>)}</div>
   <button type="button" className={styles.primary} disabled={pending||code.some(value=>!value)} onClick={()=>void verify()}>{pending?<Loader2 className={styles.spin} size={18}/>:<Check size={18}/>}Подтвердить номер</button>
   <button type="button" className={styles.back} onClick={()=>{setStage("phone");setCode(["","","","","",""]);setError("");}}><ArrowLeft size={15}/>Изменить номер</button>
  </>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
 </section>;
}
