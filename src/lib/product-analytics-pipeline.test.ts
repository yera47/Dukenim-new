import{describe,expect,it}from"vitest";
import{acceptLiveAnalyticsEvent,productAnalyticsCollectionEnabled,SyntheticAnalyticsStore,syntheticAnalyticsFixture}from"./product-analytics-pipeline";

describe("synthetic-only product analytics pipeline",()=>{
  it("keeps real collection off by default and exposes no fallback ingestion",()=>{expect(productAnalyticsCollectionEnabled({})).toBe(false);expect(acceptLiveAnalyticsEvent()).toEqual({accepted:false,reason:"collection-not-mounted"});});
  it("rejects any record that is not explicitly synthetic",()=>{const store=new SyntheticAnalyticsStore();expect(()=>store.ingest({source:"real",tenant_id:"synthetic-tenant"} as never)).toThrow("Only synthetic");});
  it("stores normalized fixtures and aggregates deterministic heatmap cells",()=>{const snapshot=syntheticAnalyticsFixture().snapshot("merchant.analytics");expect(snapshot.events).toHaveLength(9);expect(snapshot.sessions).toBe(3);expect(snapshot.actions).toBe(7);expect(Math.max(...snapshot.cells.map(cell=>cell.count))).toBe(3);expect(snapshot.cells.every(cell=>cell.intensity>=0&&cell.intensity<=1)).toBe(true);});
  it("never stores arbitrary text, customer data or raw coordinates",()=>{const event=syntheticAnalyticsFixture().snapshot("merchant.analytics").events[0];expect(event).not.toHaveProperty("payload");expect(event).not.toHaveProperty("message");expect(event).not.toHaveProperty("email");expect(event).not.toHaveProperty("x");expect(event).not.toHaveProperty("y");});
});
