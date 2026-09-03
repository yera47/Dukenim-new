"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RegisterState = { error: string | null };

const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");

export async function register(_: RegisterState, formData: FormData): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const business = String(formData.get("business") ?? "").trim();
  const socialRegistration = formData.get("socialRegistration") === "true";
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");

  if (!name || !business) return { error: "Введите ваше имя и название бизнеса." };
  if (formData.get("accepted") !== "on") return { error: "Для регистрации необходимо принять оферту и политику конфиденциальности." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: "Регистрация временно недоступна: не настроен сервисный ключ." };

  const admin = createAdminClient();
  let email = String(formData.get("email") ?? "").trim().toLowerCase();
  let userId = "";
  let shouldDeleteUserOnFailure = false;

  if (socialRegistration) {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user?.email) return { error: "Сессия входа не найдена. Начните вход через Google или Apple ещё раз." };
    const existingMembership = await admin.from("tenant_users").select("tenant_id").eq("user_id", user.id).maybeSingle();
    if (existingMembership.error) return { error: "Не удалось проверить существующий кабинет. Попробуйте ещё раз." };
    if (existingMembership.data) return { error: "Для этого аккаунта магазин уже создан. Войдите в кабинет." };
    email = user.email.toLowerCase();
    userId = user.id;
  } else {
    if (!email || password.length < 8) return { error: "Заполните все поля. Пароль должен содержать минимум 8 символов." };
    if (password !== passwordConfirmation) return { error: "Пароли не совпадают. Проверьте оба поля." };
    const { data: userData, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, business } });
    if (userError || !userData.user) return { error: userError?.message.includes("already") ? "Аккаунт с таким email уже существует." : "Не удалось создать аккаунт. Попробуйте ещё раз." };
    userId = userData.user.id;
    shouldDeleteUserOnFailure = true;
  }

  let slug = slugify(business) || `store-${userId.slice(0, 8)}`;
  const existing = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
  if (existing.data) slug = `${slug}-${userId.slice(0, 5)}`;
  const trialEnd = new Date(Date.now() + 7 * 86400000).toISOString();
  const { data: tenant, error: tenantError } = await admin.from("tenants").insert({ name: business, slug, status: "trial", plan: "basic", next_plan: "standard", trial_ends_at: trialEnd, onboarding_completed: false, accent_color: "#0b4b3a", phone: "" }).select("id").single();
  if (tenantError || !tenant) {
    if (shouldDeleteUserOnFailure) await admin.auth.admin.deleteUser(userId);
    return { error: "Не удалось создать магазин. Попробуйте другое название." };
  }

  const setup = await Promise.all([
    admin.from("profiles").upsert({ user_id: userId, role: "owner" }, { onConflict: "user_id" }),
    admin.from("tenant_users").insert({ tenant_id: tenant.id, user_id: userId, role: "owner" }),
    admin.from("tenant_settings").insert({ tenant_id: tenant.id }),
    admin.from("tenant_storefront_settings").insert({ tenant_id: tenant.id }),
  ]);
  if (setup.some(result => result.error)) {
    await admin.from("tenants").delete().eq("id", tenant.id);
    if (shouldDeleteUserOnFailure) await admin.auth.admin.deleteUser(userId);
    return { error: "Не удалось подготовить кабинет. Попробуйте ещё раз." };
  }

  if (!socialRegistration) {
    const client = await createClient();
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) return { error: "Аккаунт создан. Войдите с указанными данными." };
  }
  redirect("/onboarding");
}
