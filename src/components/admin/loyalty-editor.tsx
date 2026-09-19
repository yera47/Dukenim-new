"use client";
import {useState} from "react";
import {Gift,Plus,ChevronRight,Trash2} from "lucide-react";
import {newLoyaltyRule,ruleDescription,type LoyaltyProgram,type LoyaltyRule} from "@/lib/loyalty";
import styles from "./loyalty-editor.module.css";

export function LoyaltyEditor({value,onChange}:{value:LoyaltyProgram;onChange:(value:LoyaltyProgram)=>void}) {
 const [selected,setSelected]=useState(0);
 const rule=value.rules[selected]??value.rules[0];
 function change(patch:Partial<LoyaltyRule>){onChange({...value,rules:value.rules.map((item,index)=>index===selected?{...item,...patch,id:crypto.randomUUID()}:item)});}
 function number(key:"threshold"|"value"|"minOrder"|"expiryDays",label:string,max:number){return <label>{label}<input type="number" min={key==="minOrder"||key==="expiryDays"?0:1} max={max} step={1} value={rule[key]} onChange={e=>change({[key]:Number(e.target.value)})}/></label>;}
 return <section className={styles.editor} aria-label="Конструктор лояльности">
  <div className={styles.heading}><span><Gift size={22}/></span><div><h2>Повод вернуться</h2><p>Соберите программу для своих гостей</p></div></div>
  <label>Название карты<input maxLength={60} value={value.name} onChange={e=>onChange({...value,name:e.target.value})}/></label>
  <div className={styles.tabs}>{value.rules.map((item,index)=><button type="button" key={index} aria-pressed={selected===index} onClick={()=>setSelected(index)}>Правило {index+1}</button>)}{value.rules.length<8&&<button type="button" onClick={()=>{onChange({...value,rules:[...value.rules,newLoyaltyRule()]});setSelected(value.rules.length);}}><Plus size={16}/>Добавить правило</button>}</div>
  <div className={styles.rule}>
   <label><b>1. За что награждаем</b><select value={rule.trigger} onChange={e=>change({trigger:e.target.value as LoyaltyRule["trigger"],reward:rule.reward==="cashback"?"gift":rule.reward,threshold:e.target.value==="spend"?10000:6})}><option value="orders">За количество заказов</option><option value="product">За товары из категории</option><option value="spend">За сумму покупок</option><option value="referral">За приглашённых друзей</option></select></label>
   {rule.trigger==="product"&&<label>Категория товаров<input value={rule.category} maxLength={80} placeholder="Например, Кофе" onChange={e=>change({category:e.target.value})}/><small>Название должно совпадать с разделом вашего меню.</small></label>}
   {number("threshold",rule.trigger==="spend"?"Накопить покупок на сумму, ₸":rule.trigger==="referral"?"Сколько друзей должны сделать первый заказ":"Сколько оплаченных покупок до награды",10000000)}
   <label><b>2. Что получает гость</b><select value={rule.reward} onChange={e=>{const reward=e.target.value as LoyaltyRule["reward"];change({reward,value:reward==="gift"?1:10,...(reward==="cashback"?{trigger:"orders",threshold:1}:{}),label:reward==="gift"?"Кофе в подарок":reward==="cashback"?"Кешбэк на следующий заказ":"Скидка на следующий заказ"});}}><option value="gift">Подарок</option><option value="percent">Скидка в процентах</option><option value="fixed">Скидка в тенге</option><option value="cashback">Кешбэк с каждого заказа</option></select></label>
   <label>{rule.reward==="gift"?"Какой подарок":"Название награды"}<input maxLength={100} value={rule.label} onChange={e=>change({label:e.target.value})}/></label>
   {rule.reward!=="gift"&&number("value",rule.reward==="fixed"?"Размер скидки, ₸":"Размер, %",rule.reward==="fixed"?10000000:100)}
   {rule.reward==="gift"&&<small>Подарок выдаёт продавец вместе со следующим заказом. Укажите размер и состав: например, капучино 250 мл.</small>}
   <details><summary>Дополнительные условия</summary><div className={styles.conditions}>{number("minOrder","Минимальная сумма заказа, ₸",999999999)}{number("expiryDays","Срок действия награды, дней · 0 — без срока",365)}<label className={styles.check}><input type="checkbox" checked={rule.repeat} onChange={e=>change({repeat:e.target.checked})}/>Повторять после каждой выполненной цели</label><label className={styles.check}><input type="checkbox" checked={rule.earnOnReward} onChange={e=>change({earnOnReward:e.target.checked})}/>Засчитывать покупки с наградой</label></div></details>
   {value.rules.length>1&&<button type="button" className={styles.remove} onClick={()=>{onChange({...value,rules:value.rules.filter((_,index)=>index!==selected)});setSelected(0);}}><Trash2 size={15}/>Убрать правило</button>}
  </div>
  <div className={styles.preview}><div><span>{value.name||"Клуб гостей"}</span><Gift size={22}/></div><h3>{rule.label||"Ваша награда"}</h3>{rule.trigger!=="spend"&&rule.threshold<=12?<div className={styles.stamps}>{Array.from({length:rule.threshold},(_,index)=><span key={index}>{index+1}</span>)}<span><Gift size={16}/></span></div>:<div className={styles.bar}><i/></div>}<p>{ruleDescription(rule)}</p><small>Пример карты · прогресс появится после покупки</small></div>
  <p className={styles.note}><ChevronRight size={15}/>Засчитываются выданные и оплаченные заказы. Награда используется со следующей покупкой, одна на заказ. Доставка не участвует в расчёте.</p>
  <label>Ваши дополнительные условия<textarea rows={2} maxLength={1200} value={value.terms} placeholder="Например, подарок можно получить в любой нашей точке" onChange={e=>onChange({...value,terms:e.target.value})}/></label>
 </section>;
}
