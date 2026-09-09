import { expect, it } from "vitest";
import { commerceConfigurations } from "./commerce-configurations";
import { configurationSlug, storefrontPath } from "./storefront-path";

it("keeps every configuration in a separate validated URL space",()=>{
  for(const c of commerceConfigurations)expect(storefrontPath(configurationSlug(c.vertical,c.approach))).toBe(c.href);
});
it("preserves tenant routes and does not interpret unknown configurations",()=>{
  expect(storefrontPath("serik-shop")).toBe("/s/serik-shop");
  expect(storefrontPath("demo--services--guided")).toBe("/s/demo--services--guided");
});
