export type TrialClockState = "active" | "expired" | "not_trial";

export type TrialClockDisplay = {
  state: TrialClockState;
  remainingMs: number;
  fullLabel: string;
  compactLabel: string;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function monotonicServerNow(serverNow:number,monotonicStartedAt:number,monotonicNow:number){
  return serverNow+Math.max(0,monotonicNow-monotonicStartedAt);
}

export function startMonotonicTrialTicker<T>(input:{serverNow:number;monotonicNow:()=>number;publish:(now:number)=>void;setInterval:(callback:()=>void,ms:number)=>T}):T{
  const startedAt=input.monotonicNow();
  const update=()=>input.publish(monotonicServerNow(input.serverNow,startedAt,input.monotonicNow()));
  update();
  return input.setInterval(update,30_000);
}

function plural(value: number, forms: [string, string, string]) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export function trialClockDisplay(input: { status: string; endsAt: string | null; nowMs: number }): TrialClockDisplay {
  if (input.status !== "trial") return { state: "not_trial", remainingMs: 0, fullLabel: "Пробный период не активен", compactLabel: "Не trial" };
  const endMs = input.endsAt ? Date.parse(input.endsAt) : Number.NaN;
  const remainingMs = Number.isFinite(endMs) ? Math.max(0, endMs - input.nowMs) : 0;
  if (remainingMs <= 0) return { state: "expired", remainingMs: 0, fullLabel: "Пробный период завершён", compactLabel: "Trial завершён" };

  if (remainingMs >= DAY) {
    const days = Math.floor(remainingMs / DAY);
    const hours = Math.floor((remainingMs % DAY) / HOUR);
    return {
      state: "active",
      remainingMs,
      fullLabel: `Осталось ${days} ${plural(days, ["день", "дня", "дней"])} ${hours} ${plural(hours, ["час", "часа", "часов"])}`,
      compactLabel: `${days} д ${hours} ч`,
    };
  }

  const totalMinutes = Math.max(1, Math.ceil(remainingMs / MINUTE));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    state: "active",
    remainingMs,
    fullLabel: `Осталось ${hours} ${plural(hours, ["час", "часа", "часов"])} ${minutes} ${plural(minutes, ["минута", "минуты", "минут"])}`,
    compactLabel: `${hours} ч ${minutes} мин`,
  };
}
