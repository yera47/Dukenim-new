import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";

export default async function ContinueAfterAuth() {
  const context = await getSessionContext();
  if (!context) redirect("/login");
  if (context.role === "superadmin") redirect("/root");
  if (context.role === "owner") redirect("/admin");
  redirect("/register?social=1");
}
