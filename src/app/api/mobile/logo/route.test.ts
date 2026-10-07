import {describe,expect,it,vi} from "vitest";
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/lib/mobile-auth",()=>({getMobileOwner:vi.fn()}));
import {DELETE} from "./route";
import {ownedLogoPath} from "@/lib/logo-storage";

const tenant="11111111-1111-4111-8111-111111111111";
describe("mobile logo ownership",()=>{
  it("only returns generated PNG paths owned by the selected tenant",()=>{
    expect(ownedLogoPath(`https://cdn.test/storage/v1/object/public/product-images/${tenant}/logo-safe.png`,tenant)).toBe(`${tenant}/logo-safe.png`);
    expect(ownedLogoPath("https://cdn.test/storage/v1/object/public/product-images/22222222-2222-4222-8222-222222222222/logo-safe.png",tenant)).toBeNull();
    expect(ownedLogoPath(`https://cdn.test/storage/v1/object/public/product-images/${tenant}/other.png`,tenant)).toBeNull();
    expect(ownedLogoPath(`https://cdn.test/storage/v1/object/public/product-images/${tenant}%2F..%2Flogo-bad.png`,tenant)).toBeNull();
  });
  it("rejects delete before auth or tenant storage access",async()=>{
    const response=await DELETE(new Request(`https://local.test/api/mobile/logo?tenantId=${tenant}`,{method:"DELETE"}));
    expect(response.status).toBe(401);
  });
});
