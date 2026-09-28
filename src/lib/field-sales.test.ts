import { describe, expect, it } from "vitest";
import { buildVisitRoute, fieldSalesReturnPath, parseLocalDateTime, safeExternalUrl } from "./field-sales";
import type { FieldSalesLead } from "./field-sales";

const lead = (id: string, longitude: number, latitude: number, priority_score = 50): FieldSalesLead => ({
  id, longitude, latitude, priority_score, status: "new", external_source: "test", external_id: id, zone_id: "Z1", name: id,
  address: "", segment: "Еда", subsegment: "", phone: null, instagram_url: null, website_url: null, whatsapp_url: null,
  map_url: null, schedule: null, rating: null, review_count: 0, branch_count: 1, priority: "B", contact_name: null,
  contact_role: null, contact_phone: null, notes: "", next_action: "", reminder_at: null, reminder_type: "task", reminder_completed_at: null, last_visit_at: null,
  assigned_to: null, route_day: null, route_position: null, created_at: "", updated_at: "",
});

describe("field sales route", () => {
  it("starts in the north-west and visits every selected lead once", () => {
    const route = buildVisitRoute([lead("south", 71.43, 51.1), lead("north-east", 71.44, 51.13), lead("north-west", 71.42, 51.13)], 3);
    expect(route.map((item) => item.id)).toEqual(["north-west", "north-east", "south"]);
  });
  it("excludes closed leads and respects the stop limit", () => {
    const closed = { ...lead("closed", 71.41, 51.14, 100), status: "won" as const };
    expect(buildVisitRoute([closed, lead("a", 71.42, 51.13), lead("b", 71.43, 51.12)], 1).map((item) => item.id)).toEqual(["a"]);
  });
});

describe("safeExternalUrl", () => {
  it("allows only http links", () => {
    expect(safeExternalUrl("https://instagram.com/test")).toContain("instagram.com");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("field sales form safety", () => {
  it("keeps returns inside the field sales pages", () => {
    expect(fieldSalesReturnPath("/admin/sales?zone=Z001&lead=x", "abc")).toBe("/admin/sales?zone=Z001&lead=x#lead-abc");
    expect(fieldSalesReturnPath("https://evil.example", "abc")).toBe("/root/sales#lead-abc");
  });
  it("rejects an invalid reminder instead of crashing during serialization", () => {
    expect(() => parseLocalDateTime("not-a-date")).toThrow("Проверьте дату");
    expect(parseLocalDateTime("")).toBeNull();
  });
});
