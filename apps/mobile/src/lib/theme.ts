export const colors = {
  navy: "#173B57",
  navyDark: "#0E2A40",
  navySoft: "#EDF4F8",
  ink: "#111820",
  stone: "#F4F0E8",
  paper: "#FFFDF8",
  muted: "#5F6A72",
  line: "#D8E0E6",
  danger: "#B93B35",
  success: "#326348",
};

export const site = "https://www.dukenim.kz";

export function money(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₸`;
}

