import { describe, expect, it } from "vitest";
import { pickupLocationSchema, safeMapUrl } from "./pickup-location";
describe("pickup location", () => {
  it.each(["javascript:alert(1)", "https://yandex.ru.evil.test/maps/", "https://user:pass@yandex.ru/maps/", "http://yandex.ru/maps/", "https://yandex.ru:4430/maps/"])("rejects unsafe link %s", url => expect(safeMapUrl(url,"yandex")).toBe(false));
  it("allows official shared URLs and narrow embed paths", () => {
    expect(safeMapUrl("https://2gis.kz/almaty/geo/123","gis")).toBe(true);
    expect(safeMapUrl("https://yandex.kz/maps/?rtext=~43,76","yandex")).toBe(true);
    expect(safeMapUrl("https://api-maps.yandex.ru/frame/v1/-/example","embed")).toBe(true);
    expect(safeMapUrl("https://yandex.ru/search/?text=x","embed")).toBe(false);
  });
  it("requires address and preparation but does not require a paid map API", () => {
    const point = {address:"Город, улица, дом",hours:"10–19",preparation:"После подтверждения",instructions:"",gisUrl:"",yandexUrl:"",embedUrl:""};
    expect(pickupLocationSchema.safeParse(point).success).toBe(true);
    expect(pickupLocationSchema.safeParse({...point,address:""}).success).toBe(false);
    expect(pickupLocationSchema.safeParse({...point,tenant_id:"victim"}).success).toBe(false);
  });
});
