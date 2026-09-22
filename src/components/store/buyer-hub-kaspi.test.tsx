import React from "react";
import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {RemoteKaspiPayment} from "./buyer-hub";

const order={
  id:"order-1",order_number:47,status:"new",payment_status:"pending",payment_method:"kaspi",
  total:21000,delivery_method:"pickup",created_at:"2026-09-22T12:00:00Z",reward_label:null,
  loyalty_discount:0,items:[],
};

describe("remote Kaspi buyer handoff",()=>{
  it("explains that the order exists before a manual Kaspi transition",()=>{
    const html=renderToStaticMarkup(<RemoteKaspiPayment order={order} link="https://pay.kaspi.kz/pay/example"/>);
    expect(html).toContain("Заказ №47 уже создан");
    expect(html).toContain("сумму нужно ввести вручную");
    expect(html).toContain("Показать сумму и перейти в Kaspi");
    expect(html).not.toContain(">Оплатить 21");
  });

  it("shows merchant confirmation after payment is verified",()=>{
    const html=renderToStaticMarkup(<RemoteKaspiPayment order={{...order,status:"confirmed",payment_status:"paid"}} link={null}/>);
    expect(html).toContain("Оплата и заказ подтверждены магазином");
  });
});
