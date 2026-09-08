import {beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),rpc:vi.fn(),from:vi.fn()}));
vi.mock("@/lib/auth",()=>({getSessionContext:m.session}));
vi.mock("@/lib/supabase/server",()=>({createClient:()=>({rpc:m.rpc,from:m.from})}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw new Error(`redirect:${url}`);}}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
import {openDomainSupport,sendThreadMessage} from "./thread-actions";
describe("support thread actions",()=>{
 beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({user:{id:"owner"},role:"owner",tenantId:"own-shop"});});
 it("does not create requests on anonymous access",async()=>{m.session.mockResolvedValue(null);await expect(openDomainSupport()).rejects.toThrow("redirect:/login");expect(m.rpc).not.toHaveBeenCalled();});
 it("opens the server-returned thread for the session tenant",async()=>{m.rpc.mockResolvedValue({data:"thread-id",error:null});await expect(openDomainSupport()).rejects.toThrow("redirect:/admin/requests/thread-id");expect(m.rpc).toHaveBeenCalledWith("open_domain_support",{p_tenant_id:"own-shop"});});
 it("never redirects as if failed sending succeeded",async()=>{m.rpc.mockResolvedValue({data:null,error:{message:"database error"}});await expect(openDomainSupport()).rejects.toThrow("Обращение не отправлено");});
 it("rejects forged input before database access",async()=>{const form=new FormData();form.set("requestId","bad");form.set("text","Ответ");expect(await sendThreadMessage({},form)).toHaveProperty("error");expect(m.from).not.toHaveBeenCalled();});
});
