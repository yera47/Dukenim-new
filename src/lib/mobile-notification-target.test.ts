import { describe, expect, it } from "vitest";
import { notificationTarget } from "../../apps/mobile/src/lib/notification-target";
const orderId = "11111111-1111-4111-8111-111111111111";
const tenantId = "22222222-2222-4222-8222-222222222222";
describe("native notification target", () => {
  it("extracts only validated identifiers, never a supplied URL", () => {
    expect(notificationTarget({ orderId, tenantId, url: "https://evil.test", role: "superadmin" })).toEqual({ orderId, tenantId });
  });
  it.each([null, [], { url: "/root" }, { orderId, tenantId: "../admin" }, { orderId: [orderId], tenantId }])("rejects malformed target %j", value => {
    expect(notificationTarget(value)).toBeNull();
  });
});
