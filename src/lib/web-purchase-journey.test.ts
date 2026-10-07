import { describe, expect, it, vi } from "vitest";
import { addCartItem, setCartQuantity, variantLabel } from "./cart-items";
import type { Product } from "./demo-data";
import { emptyFoodSelection } from "./food-options";
import { formatCustomerDeliveryAddress, isCustomerDeliveryAddressReady } from "./customer-delivery-address";
import { parseDeliveryZone } from "./delivery-zone";
import { createCheckoutSubmissionGuard } from "./checkout-submit-guard";
import { checkoutPayloadFingerprint, getOrCreateCheckoutKey } from "./checkout-idempotency";
import { submitCheckout } from "./checkout-submit";
import { buyerOrderProgress } from "./buyer-order-progress";
import { deliveryChannelStatus, paymentChannelStatus } from "./commerce-channel-status";

const retail: Product = { id: "synthetic-retail", title: "Synthetic jacket", description: "fixture", price: 32000, category: "Clothes", variants: [
  { id: "black-m", size: "M", color: "Black", stock: 1 },
  { id: "black-l", size: "L", color: "Black", stock: 0 },
], images: [] };

function memoryStorage() { const values = new Map<string,string>(); return { getItem:(key:string)=>values.get(key)??null, setItem:(key:string,value:string)=>{values.set(key,value);}, removeItem:(key:string)=>{values.delete(key);} }; }

describe("synthetic web purchase journey", () => {
  it("keeps retail variants distinct, blocks unavailable stock and supports an empty cart", () => {
    expect(variantLabel(retail, "black-m")).toContain("M");
    const withAvailable = addCartItem([], retail, "black-m", emptyFoodSelection);
    expect(withAvailable).toHaveLength(1);
    expect(addCartItem(withAvailable, retail, "black-l", emptyFoodSelection)).toBe(withAvailable);
    expect(setCartQuantity(withAvailable, withAvailable[0].lineId, 0)).toEqual([]);
  });

  it("persists one idempotency key across reload and blocks a double click", () => {
    const storage = memoryStorage();
    const payload = checkoutPayloadFingerprint({ slug:"fixture", items:[{variantId:"black-m",qty:1}] });
    const create = vi.fn(() => "11111111-1111-4111-8111-111111111111");
    expect(getOrCreateCheckoutKey(storage, "fixture", payload, create)).toBe(getOrCreateCheckoutKey(storage, "fixture", payload, create));
    expect(create).toHaveBeenCalledOnce();
    const guard = createCheckoutSubmissionGuard();
    expect([guard.acquire(), guard.acquire()]).toEqual([true, false]);
  });

  it("separates pickup, merchant delivery and Yandex manual-after-order behavior", () => {
    const own = new FormData(); own.set("name","Fixture zone"); own.set("cost","1500"); own.set("freeFrom","10000"); own.set("provider","own");
    const yandex = new FormData(); yandex.set("name","Yandex fixture"); yandex.set("cost","0"); yandex.set("provider","yandex");
    expect(parseDeliveryZone(own)).toMatchObject({ success:true, data:{ cost:1500, free_from:10000, provider:"own" } });
    expect(parseDeliveryZone(yandex)).toMatchObject({ success:true, data:{ provider:"yandex" } });
    expect(deliveryChannelStatus("own")).toEqual({ mode:"merchant-fulfilled", createsCourierJob:false, checkoutFeeKnown:true });
    expect(deliveryChannelStatus("yandex")).toEqual({ mode:"manual-after-order", createsCourierJob:false, checkoutFeeKnown:false });
  });

  it("requires and preserves the delivery address without calling a courier", () => {
    const address = { street:"Абая", house:"10", apartment:"12", entrance:"2", floor:"4", comment:"fixture" };
    expect(isCustomerDeliveryAddressReady(address)).toBe(true);
    expect(formatCustomerDeliveryAddress(address)).toContain("Абая");
    expect(isCustomerDeliveryAddressReady({ ...address, house:"" })).toBe(false);
  });

  it("does not confuse manual Kaspi or WhatsApp instructions with verified acquiring", () => {
    expect(paymentChannelStatus({ method:"kaspi", verifiedAcquiringWebhook:false })).toEqual({ mode:"manual", canMarkPaidAutomatically:false });
    expect(paymentChannelStatus({ method:"kaspi", verifiedAcquiringWebhook:true })).toEqual({ mode:"automatic", canMarkPaidAutomatically:true });
    expect(paymentChannelStatus({ method:"cash", verifiedAcquiringWebhook:false }).canMarkPaidAutomatically).toBe(false);
  });

  it("accepts only a saved order confirmation and maps seller states to buyer progress", async () => {
    await expect(submitCheckout({ slug:"fixture" }, "11111111-1111-4111-8111-111111111111", vi.fn().mockResolvedValue(Response.json({ orderNumber:7,total:33500 })))).resolves.toEqual({ orderNumber:7,total:33500 });
    expect(buyerOrderProgress({ status:"new", delivery_method:"courier" }).index).toBe(0);
    expect(buyerOrderProgress({ status:"confirmed", delivery_method:"courier" }).index).toBe(1);
    expect(buyerOrderProgress({ status:"delivering", delivery_method:"courier" }).index).toBe(2);
    expect(buyerOrderProgress({ status:"done", delivery_method:"courier" }).index).toBe(3);
    expect(buyerOrderProgress({ status:"cancelled", delivery_method:"pickup" }).closed).toBe(true);
  });
});
