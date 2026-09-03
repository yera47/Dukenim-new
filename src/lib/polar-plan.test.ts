import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPolarProductId, isPolarConfigured, isPolarWebhookConfigured, planFromPolarProductId } from "./polar-plan";

const ENV_KEYS = ["POLAR_ACCESS_TOKEN", "POLAR_WEBHOOK_SECRET", "POLAR_BASIC_MONTHLY_PRODUCT_ID", "POLAR_BASIC_ANNUAL_PRODUCT_ID", "POLAR_STANDARD_MONTHLY_PRODUCT_ID", "POLAR_STANDARD_ANNUAL_PRODUCT_ID"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  ENV_KEYS.forEach((key) => delete process.env[key]);
});

afterEach(() => {
  ENV_KEYS.forEach((key) => {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  });
});

describe("polar configuration helpers", () => {
  it("is unconfigured without an access token", () => {
    process.env.POLAR_BASIC_MONTHLY_PRODUCT_ID = "prod_basic_monthly";
    expect(isPolarConfigured()).toBe(false);
    expect(isPolarConfigured("basic", "monthly")).toBe(false);
  });

  it("is configured per plan/period once the token and that product id exist", () => {
    process.env.POLAR_ACCESS_TOKEN = "token";
    process.env.POLAR_BASIC_MONTHLY_PRODUCT_ID = "prod_basic_monthly";
    expect(isPolarConfigured("basic", "monthly")).toBe(true);
    expect(isPolarConfigured("basic", "annual")).toBe(false);
    expect(isPolarConfigured("standard", "monthly")).toBe(false);
  });

  it("requires all four product ids for the plan-agnostic check", () => {
    process.env.POLAR_ACCESS_TOKEN = "token";
    process.env.POLAR_BASIC_MONTHLY_PRODUCT_ID = "a";
    process.env.POLAR_BASIC_ANNUAL_PRODUCT_ID = "b";
    process.env.POLAR_STANDARD_MONTHLY_PRODUCT_ID = "c";
    expect(isPolarConfigured()).toBe(false);
    process.env.POLAR_STANDARD_ANNUAL_PRODUCT_ID = "d";
    expect(isPolarConfigured()).toBe(true);
  });

  it("maps plan + period to the matching env-configured product id", () => {
    process.env.POLAR_STANDARD_ANNUAL_PRODUCT_ID = "prod_standard_annual";
    expect(getPolarProductId("standard", "annual")).toBe("prod_standard_annual");
    expect(getPolarProductId("pro", "annual")).toBe("prod_standard_annual");
    expect(getPolarProductId("basic", "annual")).toBeNull();
  });

  it("maps a Polar product id back to the internal plan", () => {
    process.env.POLAR_BASIC_MONTHLY_PRODUCT_ID = "prod_basic_monthly";
    expect(planFromPolarProductId("prod_basic_monthly")).toBe("basic");
    expect(planFromPolarProductId("prod_unknown")).toBeNull();
  });

  it("checks the webhook secret independently of checkout configuration", () => {
    expect(isPolarWebhookConfigured()).toBe(false);
    process.env.POLAR_WEBHOOK_SECRET = "whsec_test";
    expect(isPolarWebhookConfigured()).toBe(true);
  });
});
