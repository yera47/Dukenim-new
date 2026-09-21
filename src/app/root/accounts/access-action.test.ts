import {beforeEach,describe,expect,it,vi} from "vitest";

const mock=vi.hoisted(()=>({requireRole:vi.fn(),createAdminClient:vi.fn(),audit:vi.fn(),revalidatePath:vi.fn()}));
vi.mock("@/lib/auth",()=>({requireRole:mock.requireRole}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:mock.createAdminClient}));
vi.mock("@/lib/queries/root",()=>({createPlatformAuditEvent:mock.audit}));
vi.mock("next/cache",()=>({revalidatePath:mock.revalidatePath}));
import {setRootAccountAccess} from "./access-action";

const actor="11111111-1111-4111-8111-111111111111";
const target="22222222-2222-4222-8222-222222222222";
function form(email="owner@example.com"){
 const data=new FormData();data.set("userId",target);data.set("confirmEmail",email);data.set("expectedBlocked","false");data.set("block","true");data.set("reason","Проверка доступа владельца");return data;
}
const initial={error:"",success:""};

describe("root account new-login access",()=>{
 beforeEach(()=>{
  vi.clearAllMocks();mock.requireRole.mockResolvedValue({user:{id:actor},role:"superadmin"});mock.audit.mockResolvedValue({error:null});
 });
 it("rejects an unverified local superadmin before opening the admin client",async()=>{
  mock.requireRole.mockResolvedValue({user:null,role:"superadmin"});
  expect((await setRootAccountAccess(initial,form())).error).toContain("настоящий аккаунт");
  expect(mock.createAdminClient).not.toHaveBeenCalled();
 });
 it("never lets a root account block itself",async()=>{
  const data=form();data.set("userId",actor);
  expect((await setRootAccountAccess(initial,data)).error).toContain("Проверьте аккаунт");
  expect(mock.createAdminClient).not.toHaveBeenCalled();
 });
 it("requires an exact email and denies a superadmin target",async()=>{
  const updateUserById=vi.fn();
  const profile={data:{role:"superadmin"},error:null};
  mock.createAdminClient.mockReturnValue({auth:{admin:{getUserById:vi.fn().mockResolvedValue({data:{user:{email:"owner@example.com",banned_until:null}},error:null}),updateUserById}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>profile})})})});
  expect((await setRootAccountAccess(initial,form("wrong@example.com"))).error).toContain("email");
  expect((await setRootAccountAccess(initial,form())).error).toContain("суперадминистратора");
  expect(updateUserById).not.toHaveBeenCalled();
 });
 it("writes audit intent before blocking new logins",async()=>{
  const updateUserById=vi.fn().mockResolvedValue({error:null});
  mock.createAdminClient.mockReturnValue({auth:{admin:{getUserById:vi.fn().mockResolvedValue({data:{user:{email:"owner@example.com",banned_until:null}},error:null}),updateUserById}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:"owner"},error:null})})})})});
  const result=await setRootAccountAccess(initial,form());
  expect(result.success).toContain("заблокированы");
  expect(mock.audit).toHaveBeenCalledTimes(2);
  expect(mock.audit.mock.invocationCallOrder[0]).toBeLessThan(updateUserById.mock.invocationCallOrder[0]);
  expect(updateUserById).toHaveBeenCalledWith(target,{ban_duration:"876000h"});
  expect(mock.revalidatePath).toHaveBeenCalledWith("/root/accounts");
 });
 it("does not block when audit is unavailable",async()=>{
  const updateUserById=vi.fn();mock.audit.mockResolvedValue({error:{message:"offline"}});
  mock.createAdminClient.mockReturnValue({auth:{admin:{getUserById:vi.fn().mockResolvedValue({data:{user:{email:"owner@example.com",banned_until:null}},error:null}),updateUserById}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:"owner"},error:null})})})})});
  expect((await setRootAccountAccess(initial,form())).error).toContain("аудита");
  expect(updateUserById).not.toHaveBeenCalled();
 });
});
