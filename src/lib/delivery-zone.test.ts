import { describe, expect, it } from "vitest";
import { parseDeliveryZone } from "./delivery-zone";
function form(cost: string, free = "") { const data = new FormData(); data.set("name", "Центр"); data.set("cost", cost); data.set("freeFrom", free); return data; }
describe("delivery zone validation", () => {
  it("keeps optional threshold absent", () => { const result = parseDeliveryZone(form("1500")); expect(result.success && result.data.free_from).toBe(null); });
  it.each(["", "-1", "1.5", "Infinity", "abc", "2000000001"])("rejects invalid KZT %s", cost => expect(parseDeliveryZone(form(cost)).success).toBe(false));
  it("allows actual free delivery", () => expect(parseDeliveryZone(form("0", "0")).success).toBe(true));
  it("rejects negative free threshold", () => expect(parseDeliveryZone(form("1000", "-1")).success).toBe(false));
});
