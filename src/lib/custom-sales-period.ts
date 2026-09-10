const DAY = 86400000;
export function customSalesPeriod(from: string, to: string) {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  if (!valid(from) || !valid(to)) throw new Error("Выберите даты начала и окончания.");
  const start = Date.parse(`${from}T00:00:00+05:00`);
  const last = Date.parse(`${to}T00:00:00+05:00`);
  const count = Math.round((last-start)/DAY)+1;
  if (count < 1 || count > 3660) throw new Error("Выберите период от 1 дня до 10 лет; окончание не раньше начала.");
  return {start:new Date(start).toISOString(),end:new Date(last+DAY-1).toISOString(),labels:Array.from({length:count},(_,i)=>new Date(start+i*DAY+5*3600000).toISOString().slice(0,10))};
}
