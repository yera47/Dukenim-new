import type { BusinessVertical } from "@/types/database";

export type NichePreset = {
  label: string;
  storeName: string;
  headline: string;
  sections: string[];
  product: string;
  price: string;
  imageUrl: string | null;
  guidance: string;
};

export const nichePresets: Record<BusinessVertical, NichePreset> = {
  fashion: {
    label: "Одежда", storeName: "FORMA", headline: "Вещи, которые работают вместе.",
    sections: ["Новинки", "Верх", "Низ", "Обувь"], product: "Пиджак Form 01", price: "48 900 ₸",
    imageUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_3IiQlgoGNOZecy2pHManEfSn5Xj/hf_20260906_215334_14f0ebab-ac72-4af5-bcf3-dcc5c4db29a8.png",
    guidance: "Размер, цвет и наличие видны до заказа.",
  },
  beauty: {
    label: "Косметика", storeName: "BARE LAB", headline: "Уход без лишних обещаний.",
    sections: ["Новинки", "Лицо", "Тело", "Наборы"], product: "Ежедневный уход", price: "18 500 ₸",
    imageUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_3IiQlgoGNOZecy2pHManEfSn5Xj/hf_20260906_215334_73c7e331-31fa-4c3a-8b02-17a1ff4c780d.png",
    guidance: "Состав и способ применения — в карточке товара.",
  },
  food: {
    label: "Еда", storeName: "TAMAK", headline: "Свежая еда. Понятный заказ.",
    sections: ["Популярное", "Завтраки", "Напитки", "Наборы"], product: "Круассан-сэндвич", price: "3 200 ₸",
    imageUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_3IiQlgoGNOZecy2pHManEfSn5Xj/hf_20260906_215334_3accd292-1f19-4b05-aa3b-03f5c03fc8ba.png",
    guidance: "Покупатель сразу выбирает получение и состав заказа.",
  },
  flowers: {
    label: "Цветы", storeName: "BES GÜL", headline: "Букеты к нужному моменту.",
    sections: ["Сегодня", "Монобукеты", "Подарки", "До 25 000 ₸"], product: "Белый букет", price: "22 000 ₸",
    imageUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_3IiQlgoGNOZecy2pHManEfSn5Xj/hf_20260907_072547_54365c3e-875a-4346-8494-dd20688ccea0.png", guidance: "Дата, пожелание и получение собираются без длинной переписки.",
  },
  services: {
    label: "Услуги", storeName: "FORMA SPACE", headline: "Услуги и условия — в одной ссылке.",
    sections: ["Услуги", "Специалисты", "Цены", "Контакты"], product: "Первая консультация", price: "от 15 000 ₸",
    imageUrl: null, guidance: "На запуске Dukenim показывает услуги и принимает заявку; календарь записи пока не обещаем.",
  },
  event: {
    label: "Мероприятия", storeName: "EVENT SPACE", headline: "Программа и билеты в одной ссылке.",
    sections: ["Ближайшее", "Программа", "Билеты", "Контакты"], product: "Входной билет", price: "от 8 000 ₸",
    imageUrl: null, guidance: "Dukenim может показать варианты и принять заявку; автоматическую билетную систему пока не обещаем.",
  },
  home: {
    label: "Интерьер", storeName: "ÜI", headline: "Предметы для спокойного дома.",
    sections: ["Свет", "Текстиль", "Декор", "Новинки"], product: "Настольная лампа", price: "39 000 ₸",
    imageUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_3IiQlgoGNOZecy2pHManEfSn5Xj/hf_20260907_072547_30d8072e-a3cc-4e1e-844e-fe55fcc1b128.png", guidance: "Размеры, материал и варианты помогают принять решение.",
  },
  other: {
    label: "Другое", storeName: "MY STORE", headline: "Ваш ассортимент — в понятном порядке.",
    sections: ["Новинки", "Популярное", "Подборки", "Все товары"], product: "Подарочный набор", price: "24 900 ₸",
    imageUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_3IiQlgoGNOZecy2pHManEfSn5Xj/hf_20260907_072547_d131734b-14a8-4e81-8720-932ec7064237.png", guidance: "AI предложит структуру, а вы сохраните только подходящее.",
  },
};
