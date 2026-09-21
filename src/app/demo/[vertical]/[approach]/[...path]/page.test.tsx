import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it,vi} from "vitest";
vi.mock("@/components/store/catalog-browser",()=>({CatalogBrowser:({products}:{products:Array<{title:string}>})=>React.createElement("div",null,products.map(product=>React.createElement("span",{key:product.title},product.title)))}));
import DemoSubpage from "./page";

describe("demo category deep links",()=>{
  it("opens a category linked from the demo header with a URL-encoded Cyrillic name",async()=>{
    const page=await DemoSubpage({params:Promise.resolve({vertical:"fashion",approach:"collection",path:["category",encodeURIComponent("Аксессуары")]})});
    const html=renderToStaticMarkup(page);
    expect(html).toContain("Аксессуары");
    expect(html).toContain("Сумка Daily");
  });
});
