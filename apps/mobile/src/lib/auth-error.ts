type AuthLikeError = { code?: string; message?: string; status?: number };

export type AuthErrorCopy = { title: string; message: string };

export function authErrorCopy(error: AuthLikeError | null | undefined): AuthErrorCopy {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return { title: "Не удалось войти", message: "Email или пароль не подошли. Проверьте данные и попробуйте снова." };
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return { title: "Подтвердите email", message: "Откройте письмо подтверждения, затем повторите вход." };
  }
  if (code === "user_banned" || message.includes("banned")) {
    return { title: "Аккаунт недоступен", message: "Обратитесь в поддержку Dukenim — вход для этого аккаунта ограничен." };
  }
  if (code.includes("network") || message.includes("fetch") || message.includes("network")) {
    return { title: "Нет связи", message: "Проверьте интернет-соединение и повторите вход." };
  }
  return { title: "Не удалось войти", message: "Повторите попытку. Если ошибка сохранится, обратитесь в поддержку Dukenim." };
}
