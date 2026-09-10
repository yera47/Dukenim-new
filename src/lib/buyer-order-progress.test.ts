import {expect,it} from "vitest";
import {buyerOrderProgress} from "./buyer-order-progress";
it("does not promise pickup before seller confirmation",()=>{for(const status of ["new","confirmed"])expect(buyerOrderProgress({status,delivery_method:"pickup"}).ready).toBe(false);expect(buyerOrderProgress({status:"assembled",delivery_method:"pickup"}).ready).toBe(true);});
it("assembled delivery is not dispatched",()=>{expect(buyerOrderProgress({status:"assembled",delivery_method:"courier"}).index).toBe(1);});
it("hides ready status as soon as a reservation expires, without waiting for cron",()=>{const state=buyerOrderProgress({status:"new",delivery_method:"pickup",reservation:{status:"confirmed",expires_at:"2026-01-01T10:00:00Z"}},Date.parse("2026-01-01T10:00:01Z"));expect(state.expired).toBe(true);expect(state.closed).toBe(true);expect(state.ready).toBe(false);});
