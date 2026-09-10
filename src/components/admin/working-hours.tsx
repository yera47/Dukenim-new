"use client";
import React, { useState } from "react";

const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
type Day = { open: boolean; from: string; to: string };
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
    onChange(next.some(day=>day.open)?next.map((day,i)=>`${days[i]} ${day.open?`${day.from}–${day.to}`:"выходной"}`).join("; "):"");
  }
  return <fieldset className="space-y-3 rounded-xl border p-4 sm:col-span-2">
    <legend className="px-2 text-sm font-semibold">Дни и часы работы</legend>
    {!editing?<><p className="text-sm">{value}</p><button type="button" className="text-sm underline" onClick={()=>setEditing(true)}>Изменить расписание</button></>:<>
      {value&&<p className="text-xs text-neutral-500">Расписание: {value}</p>}
      {schedule.map((day,index)=><div key={days[index]} className="flex flex-wrap items-center gap-3">
        <label className="flex w-20 items-center gap-2"><input type="checkbox" checked={day.open} onChange={e=>update(index,{open:e.target.checked})}/>{days[index]}</label>
        {day.open?<><input aria-label={`${days[index]}: открытие`} type="time" className="input w-auto" value={day.from} onChange={e=>{if(e.target.value)update(index,{from:e.target.value});}}/><span>—</span><input aria-label={`${days[index]}: закрытие`} type="time" className="input w-auto" value={day.to} onChange={e=>{if(e.target.value)update(index,{to:e.target.value});}}/>{day.to<=day.from&&<small>Закрытие на следующий день</small>}</>:<span className="text-sm text-neutral-500">Выходной</span>}
      </div>)}
      <p className="text-xs text-neutral-500">Отметьте рабочие дни и выберите время. Расписание сохранится вместе с текущим шагом.</p>
    </>}
  </fieldset>;
}
