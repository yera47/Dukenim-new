import {beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),rpc:vi.fn()}));
vi.mock("@/lib/auth",()=>({getSessionContext:m.session}));
vi.mock("@/lib/supabase/server",()=>({createClient:()=>({rpc:m.rpc})}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
import {GET,POST} from "./route";
const historyId="11111111-1111-4111-8111-111111111111";
const request=()=>new Request("https://dukenim.kz/api/ai-studio/design/history",{method:"POST",body:JSON.stringify({historyId})});
describe("design undo boundary",()=>{
 beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({user:{id:"owner"},role:"owner",tenantId:"own-shop"});m.rpc.mockResolvedValue({data:true,error:null});});
 it("rejects anonymous reads and writes",async()=>{m.session.mockResolvedValue(null);expect((await GET()).status).toBe(401);expect((await POST(request())).status).toBe(401);expect(m.rpc).not.toHaveBeenCalled();});
 it("uses session tenant, not supplied tenant",async()=>{expect((await POST(request())).status).toBe(200);expect(m.rpc).toHaveBeenCalledWith("undo_storefront_design",{p_tenant_id:"own-shop",p_history_id:historyId});});
 it("does not claim stale undo succeeded",async()=>{m.rpc.mockResolvedValue({data:null,error:{message:"Design conflict"}});expect((await POST(request())).status).toBe(409);});
 it("keeps history private",async()=>{m.rpc.mockResolvedValue({data:[],error:null});expect((await GET()).headers.get("cache-control")).toBe("private, no-store");});
});
