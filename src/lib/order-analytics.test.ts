import { describe, expect, it, vi } from "vitest";
import { loadSalesPeriod, salesPeriod, summarizeSales, type SalesOrder } from "./order-analytics";
const sample: SalesOrder = {id:"1", created_at:"2026-09-08T20:00:00Z", source:"online",status:"done",payment_status:"paid",total:21700};
describe("sales reporting", () => {
  it("uses Kazakhstan midnight independently of server timezone", () => {
    expect(salesPeriod(1,new Date("2026-09-08T20:30:00Z"))).toEqual({start:"2026-09-08T19:00:00.000Z",end:"2026-09-08T20:30:00.000Z",labels:["2026-09-09"]});
  });
  it("excludes pending, refunded, cancelled and out-of-period orders", () => {
    const report = summarizeSales([sample,{...sample,payment_status:"pending"},{...sample,payment_status:"refunded"},{...sample,status:"cancelled"},{...sample,created_at:"2026-08-01T00:00:00Z"}], ["2026-09-09"]);
    expect(report).toMatchObject({total:21700,count:1,online:21700,offline:0});
  });
  it("rejects amounts that cannot be calculated exactly", () => {
    expect(()=>summarizeSales([{...sample,total:1.5}], ["2026-09-09"])).toThrow();
    expect(()=>summarizeSales([{...sample,total:Number.MAX_SAFE_INTEGER},sample], ["2026-09-09"])).toThrow();
  });
  it("reads every page and retains the tenant predicate", async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ["select","eq","gte","lte","order","gt"]) chain[method]=vi.fn(()=>chain);
    chain.limit=vi.fn(()=>chain);
    const batches = [[sample],[{...sample,id:"2",source:"offline"}],[]];
    Object.assign(chain,{then:(resolve:(v:unknown)=>unknown)=>Promise.resolve({data:batches.shift(),error:null}).then(resolve)});
    const client={from:vi.fn(()=>chain)};
    const result=await loadSalesPeriod(client as never,"tenant-a",salesPeriod(1,new Date("2026-09-08T21:00:00Z")));
    expect(result.total).toBe(43400);
    expect(chain.eq).toHaveBeenCalledTimes(3);
    expect(chain.eq).toHaveBeenCalledWith("tenant_id","tenant-a");
    expect(chain.gt).toHaveBeenCalledWith("id","1");
    expect(chain.gt).toHaveBeenCalledWith("id","2");
  });
});
