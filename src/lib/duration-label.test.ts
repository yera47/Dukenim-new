import { expect, it } from "vitest";
import { hoursLabel } from "./duration-label";
it.each([[1,"1 час"],[2,"2 часа"],[11,"11 часов"],[21,"21 час"],[24,"24 часа"],[72,"72 часа"]])("labels %s hours", (value,label) => {
  expect(hoursLabel(Number(value))).toBe(label);
});
