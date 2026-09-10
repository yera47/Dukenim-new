import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {expect,it,vi} from "vitest";
vi.mock("@/components/admin/product-form",()=>({ProductForm:()=>null}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock("@/components/admin/studio-conversation",()=>({StudioConversation:({onTask,designOnly}:{onTask?:unknown;designOnly?:boolean})=><span>{typeof onTask==="function"&&designOnly?"design-connected":"missing-handler"}</span>}));
import {AiStudioClient} from "./ai-studio-client";
it("allows design proposals while waiting for the first real product",()=>{
 expect(renderToStaticMarkup(<AiStudioClient enabled imageEnabled={false} brand catalogStatus="building" catalogPublished={false} storeName="Серик" slug="serik" plan="standard" vertical="beauty"/>)).toContain("design-connected");
});
