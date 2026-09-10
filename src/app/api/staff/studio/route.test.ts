import {expect,it,vi} from "vitest";
const create=vi.hoisted(()=>vi.fn());
vi.mock("@/lib/staff-server",()=>({createStaffClient:create,createStaffAdminClient:vi.fn(()=>{throw new Error("Privileged access before authorization");})}));
vi.mock("@/lib/ai/consultation",()=>({createConsultation:vi.fn()}));
vi.mock("@/lib/ai/studio",()=>({getAiStudioStatus:()=>({configured:true})}));
import {GET,POST} from "./route";
it("rejects missing staff grant before database access",async()=>{expect((await GET(new Request("https://example.test/api/staff/studio"))).status).toBe(403);expect(create).not.toHaveBeenCalled();});
it("rejects cross-origin generation before authorization and spending",async()=>{expect((await POST(new Request("https://example.test/api/staff/studio?access=x",{method:"POST",headers:{origin:"https://foreign.test"},body:'{}'}))).status).toBe(403);});
it("rejects unauthenticated staff access",async()=>{create.mockResolvedValue({auth:{getUser:async()=>({data:{user:null}})}});expect((await GET(new Request("https://example.test/api/staff/studio?access=11111111-1111-4111-8111-111111111111"))).status).toBe(403);});
