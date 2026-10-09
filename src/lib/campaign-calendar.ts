export const campaignHorizons = [1, 2, 3, 7] as const;
export type CampaignHorizon = (typeof campaignHorizons)[number];

const months = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

const themes: Record<string, [string, string]> = {
  food: ["Сезонное меню", "Подборка к новому сезону"],
  fashion: ["Новая коллекция", "Образы этого месяца"],
  home: ["Обновление пространства", "Идеи для уютного дома"],
  beauty: ["Сезонный уход", "Подборка средств на каждый день"],
  flowers: ["Цветы этого сезона", "Букеты и подарки месяца"],
  other: ["Подборка месяца", "Новинки и популярные товары"],
  services: ["Предложение месяца", "Популярные услуги"],
};

export type CampaignCalendarMonth = {
  key: string;
  title: string;
  subtitle: string;
  startsAt: string;
  endsAt: string;
};

function monthParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return { year: read("year"), month: read("month") - 1, day: read("day") };
}

function dateOnly(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeCampaignHorizon(value: unknown): CampaignHorizon {
  const parsed = Number(value);
  return campaignHorizons.find(horizon => horizon === parsed) ?? 1;
}

/** Returns planning ideas for calendar months in Kazakhstan time; these are prompts, not official holidays. */
export function getCampaignPlanningMonths(
  horizonValue: unknown,
  vertical: string | null | undefined,
  now = new Date(),
): CampaignCalendarMonth[] {
  const horizon = normalizeCampaignHorizon(horizonValue);
  const { year: currentYear, month: currentMonth, day: currentDay } = monthParts(now);
  const [title, subtitle] = themes[vertical ?? ""] ?? themes.other;

  return Array.from({ length: horizon }, (_, offset) => {
    const absoluteMonth = currentMonth + offset;
    const year = currentYear + Math.floor(absoluteMonth / 12);
    const month = absoluteMonth % 12;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return {
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      title,
      subtitle,
      startsAt: dateOnly(year, month, offset === 0 ? currentDay : 1),
      endsAt: dateOnly(year, month, lastDay),
    };
  });
}

export function campaignMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || month < 1 || month > 12) return key;
  return `${months[month - 1]} ${year}`;
}

export function campaignDateTimeInput(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const read = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}

export function parseCampaignDateTime(value: string) {
  if (!value.trim()) return null;
  const localKzDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
  const date = new Date(localKzDateTime ? `${value}:00+05:00` : value);
  if (!Number.isFinite(date.getTime())) throw new Error("Проверьте даты показа акции");
  return date.toISOString();
}

export function campaignIdeaBrief(storeName: string, idea: CampaignCalendarMonth) {
  return `Подготовь редактируемый черновик текста акции для магазина «${storeName}». Идея: ${idea.title.toLocaleLowerCase("ru")} — ${idea.subtitle.toLocaleLowerCase("ru")}. Плановый период: ${campaignMonthLabel(idea.key)} (${idea.startsAt} — ${idea.endsAt}). Не придумывай цены, скидки, наличие, адреса или условия; если их не указал владелец, оставь формулировки нейтральными. Не публикуй и не меняй витрину.`.slice(0, 800);
}
