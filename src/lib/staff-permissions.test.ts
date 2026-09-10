import {expect,it} from "vitest";
import {noStaffPermissions,staffCan,staffPermissionsSchema,staffPresets} from "./staff-permissions";
it("denies missing, malformed and revoked access",()=>{
  for(const value of [null,{}, {orders:"write"},{...noStaffPermissions,billing:"write"}]) expect(staffCan(value,"orders","read")).toBe(false);
  expect(staffCan(staffPresets.manager.permissions,"orders","write",false)).toBe(false);
});
it("read cannot write and a module grant never grants another module",()=>{
  expect(staffCan(staffPresets.manager.permissions,"orders","write")).toBe(true);
  expect(staffCan(staffPresets.manager.permissions,"stock","read")).toBe(true);
  expect(staffCan(staffPresets.manager.permissions,"stock","write")).toBe(false);
  expect(staffCan(staffPresets.content.permissions,"orders","read")).toBe(false);
});
it("analytics is read only and owner-only areas cannot enter the schema",()=>{
  expect(staffPermissionsSchema.safeParse({...noStaffPermissions,analytics:"write"}).success).toBe(false);
  for(const field of ["billing","payments","team","owner","deleteStore"])expect(staffPermissionsSchema.safeParse({...noStaffPermissions,[field]:"write"}).success).toBe(false);
});
