"use client";
import React, { useState } from "react";

const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
type Day = { open: boolean; from: string; to: string };
const timeOptions=Array.from({length:48},(_,index)=>`${String(Math.floor(index/2)).padStart(2,"0")}:${index%2?"30":"00"}`);
function scheduleText(schedule:Day[]){return schedule.some(day=>day.open)?schedule.map((day,i)=>`${days[i]} ${day.open?`${day.from}–${day.to}`:"выходной"}`).join("; "):"";}
export function WorkingHoursField({defaultValue="",name="hours"}:{defaultValue?:string;name?:string}) {
  const [value,setValue]=useState(defaultValue);
  return <><input type="hidden" name={name} value={value}/><WorkingHours value={value} onChange={setValue}/></>;
}
export function WorkingHours({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  const [editing,setEditing]=useState(!value);
  const [schedule,setSchedule]=useState<Day[]>(()=>days.map(day=>{
    const saved=value.split("; ").find(part=>part.startsWith(`${day} `));
    const times=saved?.match(/(\d{2}:\d{2})–(\d{2}:\d{2})/);
    return {open:Boolean(times),from:times?.[1]??"10:00",to:times?.[2]??"20:00"};
  }));
  function update(index:number,change:Partial<Day>){
    const next=schedule.map((day,i)=>i===index?{...day,...change}:day);
    setSchedule(next);
    onChange(scheduleText(next));
  }
  function preset(kind:"daily"|"weekdays"){
    const next=days.map((_,index)=>({open:kind==="daily"||index<5,from:kind==="daily"?"10:00":"09:00",to:kind==="daily"?"20:00":"18:00"}));
    setSchedule(next);onChange(scheduleText(next));
  }
  function choices(current:string,closing=false){return [...new Set([...timeOptions,...(closing?["24:00"]:[]),current])].sort();}
  return <fieldset className="space-y-3 rounded-xl border p-4 sm:col-span-2">
    <legend className="px-2 text-sm font-semibold">Дни и часы работы</legend>
    {!editing?<><p className="text-sm">{value}</p><button type="button" className="text-sm underline" onClick={()=>setEditing(true)}>Изменить расписание</button></>:<>
      {value&&<p className="text-xs text-neutral-500">Расписание: {value}</p>}
      <div className="flex flex-wrap gap-2"><button type="button" className="rounded-lg border px-3 py-2 text-sm font-semibold" onClick={()=>preset("daily")}>Каждый день · 10:00–20:00</button><button type="button" className="rounded-lg border px-3 py-2 text-sm font-semibold" onClick={()=>preset("weekdays")}>Будни · 09:00–18:00</button></div>
      {schedule.map((day,index)=><div key={days[index]} className="flex flex-wrap items-center gap-3">
        <label className="flex w-20 items-center gap-2"><input type="checkbox" checked={day.open} onChange={e=>update(index,{open:e.target.checked})}/>{days[index]}</label>
        {day.open?<><select aria-label={`${days[index]}: открытие`} className="input w-auto min-w-28" value={day.from} onChange={e=>update(index,{from:e.target.value})}>{choices(day.from).map(time=><option key={time} value={time}>{time}</option>)}</select><span>—</span><select aria-label={`${days[index]}: закрытие`} className="input w-auto min-w-28" value={day.to} onChange={e=>update(index,{to:e.target.value})}>{choices(day.to,true).map(time=><option key={time} value={time}>{time}</option>)}</select>{day.to<=day.from&&<small>Закрытие на следующий день</small>}</>:<span className="text-sm text-neutral-500">Выходной</span>}
      </div>)}
      <p className="text-xs text-neutral-500">Выберите готовый график или отметьте дни и выберите время из списка с шагом 30 минут. Расписание сохранится вместе с текущим шагом.</p>
    </>}
  </fieldset>;
}
