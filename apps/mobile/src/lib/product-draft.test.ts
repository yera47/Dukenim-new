import {describe,expect,it} from "vitest";
import {emptyProductDraft,parseProductDraft,productDraftStorageKey} from "./product-draft";

describe("mobile product draft",()=>{
  it("starts without invented price or stock and stays tenant scoped",()=>{
    const draft=emptyProductDraft("shop-a");
    expect(draft.price).toBe("");expect(draft.stock).toBe("");
    expect(productDraftStorageKey("shop-a")).not.toBe(productDraftStorageKey("shop-b"));
  });
  it("restores owner-entered fields and the original photo reference",()=>{
    const draft={...emptyProductDraft("shop-a"),title:"Моя кружка",price:"5000",stock:"3",photos:[{uri:"file:///original.jpg",fileName:"original.jpg",width:1200,height:1200}]};
    expect(parseProductDraft(JSON.stringify(draft),"shop-a")).toEqual(draft);
    expect(parseProductDraft(JSON.stringify(draft),"shop-b")).toBeNull();
  });
  it("rejects malformed or oversized persisted state",()=>{
    expect(parseProductDraft("not-json","shop-a")).toBeNull();
    expect(parseProductDraft(JSON.stringify({...emptyProductDraft("shop-a"),price:"free"}),"shop-a")).toBeNull();
    expect(parseProductDraft(JSON.stringify({...emptyProductDraft("shop-a"),photos:Array.from({length:6},(_,i)=>({uri:`file:///${i}`,width:1,height:1}))}),"shop-a")).toBeNull();
  });
});
