import { describe, expect, it } from "vitest";
import { BRAND_KIT_MAX_REGENERATIONS_PER_ASSET, brandKitDraftInvalidation, brandKitProfileFingerprint, brandKitRegenerationKey, buildBrandKitPrompt, buildBrandKitTargets, canApplyBrandKitDraft, prepareBrandKitPlan, type BrandKitProfile } from "./brand-kit";

const profile: BrandKitProfile = { tenantId: "tenant-a", revision: 1, palette: { background: "#FFF8EF", surface: "#FFFFFF", accent: "#F59B14", ink: "#2B1A10" }, logoReferenceId: "logo:original", vertical: "food", categories: [{ id: "drinks", name: "Напитки" }, { id: "breakfast", name: "Завтраки" }], packagingReferenceIds: [], productReferenceIds: ["product:cup"], selectedStyle: "clay-3d", layoutRatios: { hero: "16:9", category: "1:1", story: "9:16" } };

describe("brand kit contract", () => {
  it("builds deterministic tenant-scoped inputs independent of category order", () => {
    const reordered = { ...profile, categories: [...profile.categories].reverse() };
    expect(brandKitProfileFingerprint(reordered)).toBe(brandKitProfileFingerprint(profile));
    expect(buildBrandKitPrompt(reordered, buildBrandKitTargets(reordered)[0]).idempotencyKey).toBe(buildBrandKitPrompt(profile, buildBrandKitTargets(profile)[0]).idempotencyKey);
  });
  it("never shares idempotency across tenants", () => expect(brandKitProfileFingerprint({ ...profile, tenantId: "tenant-b" })).not.toBe(brandKitProfileFingerprint(profile)));
  it("keeps logo and packaging references explicit", () => {
    const result = buildBrandKitPrompt(profile, buildBrandKitTargets(profile)[0]);
    expect(result.inputs.logoReferenceId).toBe("logo:original");
    expect(result.prompt).toContain("только оригинал отдельным слоем");
    expect(result.prompt).toContain("изображение декоративное");
  });
  it("builds hero, every category and three stories as one consistent set", () => {
    const targets = buildBrandKitTargets(profile);
    expect(targets.map(item => item.id)).toEqual(["hero", "category:drinks", "category:breakfast", "story:1", "story:2", "story:3"]);
    expect(targets.every(item => item.decorative)).toBe(true);
  });
  it("fails closed on quota, unknown price and budget", () => {
    const plan = prepareBrandKitPlan(profile, { remainingOutputs: 5, budgetCapMicros: 1_000_000, estimatedMicrosPerOutput: null });
    expect(plan.withinQuota).toBe(false);
    expect(plan.withinBudget).toBe(false);
    expect(plan.estimatedAmountMicros).toBeNull();
  });
  it("accepts a known estimate only inside both caps", () => {
    const plan = prepareBrandKitPlan(profile, { remainingOutputs: 10, budgetCapMicros: 700_000, estimatedMicrosPerOutput: 100_000 });
    expect(plan.withinQuota).toBe(true);
    expect(plan.withinBudget).toBe(true);
    expect(plan.estimatedAmountMicros).toBe(600_000);
  });
  it("invalidates a draft when brand colors change", () => {
    const changed = { ...profile, revision: 2, palette: { ...profile.palette, accent: "#A92F3D" } };
    expect(brandKitDraftInvalidation(profile, changed)).toMatchObject({ stale: true });
  });
  it("regenerates one target with a bounded attempt key", () => {
    const target = buildBrandKitTargets(profile)[1];
    expect(brandKitRegenerationKey(profile, target, 1)).not.toBe(brandKitRegenerationKey(profile, target, 2));
    expect(() => brandKitRegenerationKey(profile, target, BRAND_KIT_MAX_REGENERATIONS_PER_ASSET + 1)).toThrow(/лимит/);
  });
  it("applies only a complete current draft after explicit approval", () => {
    const ids = buildBrandKitTargets(profile).map(item => item.id);
    const input = { profile, draftFingerprint: brandKitProfileFingerprint(profile), targetIds: ids, acceptedTargetIds: ids, explicitApproval: true };
    expect(canApplyBrandKitDraft(input)).toBe(true);
    expect(canApplyBrandKitDraft({ ...input, explicitApproval: false })).toBe(false);
    expect(canApplyBrandKitDraft({ ...input, draftFingerprint: "stale" })).toBe(false);
  });
  it("invalidates a draft when only the persisted brand revision changes", () => {
    const next = { ...profile, revision: profile.revision + 1 };
    expect(brandKitProfileFingerprint(next)).not.toBe(brandKitProfileFingerprint(profile));
    expect(brandKitDraftInvalidation(profile, next)).toMatchObject({ stale: true });
  });
  it("rejects partial or duplicated apply target sets", () => {
    const ids = buildBrandKitTargets(profile).map(item => item.id);
    const base = { profile, draftFingerprint: brandKitProfileFingerprint(profile), acceptedTargetIds: ids, explicitApproval: true };
    expect(canApplyBrandKitDraft({ ...base, targetIds: ids.slice(1) })).toBe(false);
    expect(canApplyBrandKitDraft({ ...base, targetIds: [...ids, ids[0]] })).toBe(false);
  });
  it("fails closed for invalid quota and cost estimates", () => {
    expect(prepareBrandKitPlan(profile, { remainingOutputs: -1, budgetCapMicros: 1_000_000, estimatedMicrosPerOutput: 100_000 }).withinQuota).toBe(false);
    expect(prepareBrandKitPlan(profile, { remainingOutputs: 10, budgetCapMicros: 1_000_000, estimatedMicrosPerOutput: 0 }).withinBudget).toBe(false);
  });
});
