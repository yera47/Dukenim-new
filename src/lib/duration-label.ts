export function hoursLabel(hours: number): string {
  const last = hours % 10, lastTwo = hours % 100;
  const unit = lastTwo >= 11 && lastTwo <= 14 ? "часов" : last === 1 ? "час" : last >= 2 && last <= 4 ? "часа" : "часов";
  return `${hours} ${unit}`;
}
