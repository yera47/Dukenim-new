import { describe, expect, it } from "vitest";
import { emptyCatalogFilters, filterCatalog } from "./catalog-filter";
import type { Product } from "./demo-data";
const products:Product[]=[{id:"a",title:"Белая рубашка",description:"Лён",category:"Одежда",price:2000,variants:[{id:"s",size:"S",color:"Белый",stock:3},{id:"m",size:"M",color:"Белый",stock:0}]},{id:"b",title:"Чашка",description:"Белая керамика",category:"Дом",price:1000,variants:[]}];
describe("catalog discovery",()=>{
  it("matches all search words across actual fields",()=>expect(filterCatalog(products,{...emptyCatalogFilters,query:"БЕЛАЯ лён"}).map(p=>p.id)).toEqual(["a"]));
  it("does not claim an unavailable size is in stock",()=>expect(filterCatalog(products,{...emptyCatalogFilters,size:"M",inStock:true})).toEqual([]));
  it("keeps missing-variant products visible only without availability constraints",()=>{expect(filterCatalog(products,emptyCatalogFilters)).toHaveLength(2);expect(filterCatalog(products,{...emptyCatalogFilters,inStock:true})).toHaveLength(1);});
  it("sorts without changing input order",()=>{expect(filterCatalog(products,{...emptyCatalogFilters,sort:"price-asc"})[0].id).toBe("b");expect(products[0].id).toBe("a");});
  it("matches exact categories",()=>expect(filterCatalog(products,{...emptyCatalogFilters,category:"Дом"})[0].id).toBe("b"));
});
