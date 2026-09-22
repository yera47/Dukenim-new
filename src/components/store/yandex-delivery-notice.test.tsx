import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { YandexDeliveryNotice } from "./yandex-delivery-notice";

describe("Yandex delivery notice", () => {
  it("describes the actual Kaspi goods payment when enabled", () => {
    const html = renderToStaticMarkup(<YandexDeliveryNotice slug="cafe" storeName="Кафе" kaspiRemoteEnabled />);
    expect(html).toContain("через Kaspi Pay после оформления заказа");
    expect(html).not.toContain("наличными магазину");
  });

  it("describes payment on receipt when Kaspi is disabled", () => {
    const html = renderToStaticMarkup(<YandexDeliveryNotice slug="cafe" storeName="Кафе" kaspiRemoteEnabled={false} />);
    expect(html).toContain("магазину при получении");
    expect(html).not.toContain("через Kaspi Pay");
  });
});
