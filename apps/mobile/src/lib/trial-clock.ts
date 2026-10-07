export type TrialDisplay={state:"active"|"expired"|"not_trial";fullLabel:string;compactLabel:string};
const minute=60_000,hour=60*minute,day=24*hour;
const plural=(value:number,forms:[string,string,string])=>{const a=value%100,b=value%10;return a>=11&&a<=14?forms[2]:b===1?forms[0]:b>=2&&b<=4?forms[1]:forms[2];};
export function trialDisplay(status:string,endsAt:string|null,serverNowMs:number):TrialDisplay{
  if(status!=="trial")return{state:"not_trial",fullLabel:"Пробный период не активен",compactLabel:"Не trial"};
  const end=endsAt?Date.parse(endsAt):Number.NaN;const left=Number.isFinite(end)?Math.max(0,end-serverNowMs):0;
  if(left<=0)return{state:"expired",fullLabel:"Пробный период завершён",compactLabel:"Trial завершён"};
  if(left>=day){const days=Math.floor(left/day),hours=Math.floor(left%day/hour);return{state:"active",fullLabel:`Осталось ${days} ${plural(days,["день","дня","дней"])} ${hours} ${plural(hours,["час","часа","часов"])}`,compactLabel:`${days} д ${hours} ч`};}
  const totalMinutes=Math.max(1,Math.ceil(left/minute)),hours=Math.floor(totalMinutes/60),minutes=totalMinutes%60;
  return{state:"active",fullLabel:`Осталось ${hours} ${plural(hours,["час","часа","часов"])} ${minutes} ${plural(minutes,["минута","минуты","минут"])}`,compactLabel:`${hours} ч ${minutes} мин`};
}
