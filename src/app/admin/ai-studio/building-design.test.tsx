import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {expect,it,vi} from "vitest";
vi.mock("@/components/admin/product-form",()=>({ProductForm:()=>null}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock("@/components/admin/studio-conversation",()=>({StudioConversation:({onTask,builderStage,children}:{onTask?:unknown;builderStage?:string;children?:React.ReactNode})=><div data-stage={builderStage} data-task={typeof onTask}>{children}</div>}));
import {AiStudioClient} from "./ai-studio-client";
it("keeps the first-product step inside the chat shell",()=>{
 const html=renderToStaticMarkup(<AiStudioClient enabled imageEnabled={false} brand catalogStatus="building" catalogPublished={false} storeName="Серик" slug="serik" plan="standard" vertical="beauty"/>);
 expect(html).toContain("Добавьте первый товар");
 expect(html).toContain('data-stage="product"');
 expect(html).toContain('data-task="function"');
});
