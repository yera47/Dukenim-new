import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({getUser:vi.fn(),rpc:vi.fn(),redirect:vi.fn()}));
vi.mock("@/lib/staff-server",()=>({createStaffClient:async()=>({auth:{getUser:mocks.getUser},rpc:mocks.rpc}),createStaffAdminClient:vi.fn()}));
vi.mock("next/navigation",()=>({redirect:mocks.redirect}));
import {acceptInvitation} from "./actions";

const token="a".repeat(64);
function form(value=token){const data=new FormData();data.set("token",value);return data;}

describe("accept staff invitation",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.getUser.mockResolvedValue({data:{user:{id:"staff"}}});mocks.rpc.mockResolvedValue({data:"access",error:null});});
  it("rejects malformed tokens and signed-out attempts before the RPC",async()=>{
    expect(await acceptInvitation({},form("short"))).toHaveProperty("error");expect(mocks.getUser).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValueOnce({data:{user:null}});expect(await acceptInvitation({},form())).toHaveProperty("error");expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("passes only the token hash to the atomic database acceptance guard",async()=>{
    await acceptInvitation({},form());
    expect(mocks.rpc).toHaveBeenCalledWith("accept_staff_invitation",{p_hash:expect.stringMatching(/^[a-f0-9]{64}$/)});
    expect(mocks.rpc.mock.calls[0][1].p_hash).not.toBe(token);expect(mocks.redirect).toHaveBeenCalledWith("/staff");
  });
  it("does not claim access for expired, revoked, accepted or email-mismatched invitations",async()=>{
    mocks.rpc.mockResolvedValue({data:null,error:{message:"Invitation unavailable"}});
    const result=await acceptInvitation({},form());expect(result.error).toContain("истекло");expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
