import { z } from "zod";
export const staffModules = {
  orders: "Заказы", catalog: "Каталог", stock: "Склад", customers: "Клиенты",
  analytics: "Аналитика", studio: "AI Studio",
} as const;
export type StaffModule = keyof typeof staffModules;
export const accessLevel = z.enum(["none", "read", "write"]);
export const staffPermissionsSchema = z.object({
  orders: accessLevel, catalog: accessLevel, stock: accessLevel,
  customers: accessLevel, analytics: z.enum(["none", "read"]), studio: accessLevel,
}).strict();
export type StaffPermissions = z.infer<typeof staffPermissionsSchema>;
export const noStaffPermissions: StaffPermissions = { orders:"none",catalog:"none",stock:"none",customers:"none",analytics:"none",studio:"none" };
export function staffCan(value: unknown, module: StaffModule, operation: "read" | "write", active = true): boolean {
  const parsed = staffPermissionsSchema.safeParse(value);
  if (!active || !parsed.success) return false;
  const permission = parsed.data[module];
  return permission === "write" || operation === "read" && permission === "read";
}
export const staffPresets: Record<string, {label:string; permissions:StaffPermissions}> = {
  manager:{label:"Менеджер заказов",permissions:{...noStaffPermissions,orders:"write",catalog:"read",stock:"read",customers:"read"}},
  content:{label:"Контент-менеджер",permissions:{...noStaffPermissions,catalog:"write",studio:"write"}},
  warehouse:{label:"Сотрудник склада",permissions:{...noStaffPermissions,stock:"write",catalog:"read",orders:"read"}},
  analyst:{label:"Аналитик",permissions:{...noStaffPermissions,analytics:"read"}},
};
