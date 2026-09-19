import{afterEach,expect,it,vi}from"vitest";
const{admin}=vi.hoisted(()=>({admin:vi.fn()}));vi.mock("@/lib/supabase/admin",()=>({createAdminClient:admin}));
import{GET}from"./route";
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks()});
it("rejects an unsigned SMS worker request before reading the queue",async()=>{vi.stubEnv("CRON_SECRET","server-secret");const response=await GET(new Request("https://www.dukenim.kz/api/cron/sms") as never);expect(response.status).toBe(401);expect(admin).not.toHaveBeenCalled()});
