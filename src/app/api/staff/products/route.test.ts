import {beforeEach,expect,it,vi} from "vitest";
const create=vi.hoisted(()=>vi.fn());
vi.mock("@/lib/staff-server",()=>({createStaffClient:create,createStaffAdminClient:vi.fn(()=>{throw new Error("Privileged access before authorization");})}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
import {POST} from "./route";
beforeEach(()=>vi.clearAllMocks());
it("rejects cross-origin writes before any client",async()=>{expect((await POST(new Request("https://example.test/api/staff/products",{method:"POST",headers:{origin:"https://foreign.test"}}))).status).toBe(403);expect(create).not.toHaveBeenCalled();});
it("rejects anonymous upload before privileged storage",async()=>{create.mockResolvedValue({auth:{getUser:async()=>({data:{user:null}})}});expect((await POST(new Request("https://example.test/api/staff/products",{method:"POST",headers:{origin:"https://example.test"}}))).status).toBe(401);});
it("rejects oversized request before parsing",async()=>{create.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"user"}}})}});expect((await POST(new Request("https://example.test/api/staff/products",{method:"POST",headers:{origin:"https://example.test","content-length":"4000000"}}))).status).toBe(413);});
