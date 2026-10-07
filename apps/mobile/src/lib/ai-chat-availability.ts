export const aiChatProviderEnabled = process.env.EXPO_PUBLIC_AI_CHAT_PROVIDER_ENABLED === "true";

export function aiChatAvailabilityCopy(enabled = aiChatProviderEnabled) {
  return enabled
    ? {
        intro: "Меняйте витрину, тексты и настройки простыми словами. Перед важным изменением AI попросит подтверждение.",
        placeholder: "Напишите задачу…",
      }
    : {
        intro: "Проверяйте витрину и меняйте товары, оформление и настройки через готовые разделы. AI-чат пока не подключён.",
        placeholder: "AI-чат пока не подключён",
      };
}
