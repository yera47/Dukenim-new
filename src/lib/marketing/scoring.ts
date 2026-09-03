const BRAND_TERMS = [
  "бизнес", "магазин", "продажи", "маркетинг", "crm", "сайт", "приложение",
  "инстаграм", "instagram", "tiktok", "тикток", "ecommerce", "торговля",
  "предприниматель", "казахстан", "казахстане", "ии", "ai", "автоматизация",
];

export function scoreSignal(title: string, summary = "", sourceWeight = 50) {
  const haystack = `${title} ${summary}`.toLocaleLowerCase("ru");
  const matches = BRAND_TERMS.filter((term) => haystack.includes(term)).length;
  const relevance = Math.min(100, 12 + matches * 16 + Math.round(sourceWeight * 0.22));
  return { relevance, velocity: Math.min(100, 35 + Math.round(sourceWeight * 0.45)) };
}

export function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function parseRss(xml: string) {
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 30).map((match) => {
    const item = match[1];
    const field = (name: string) => decodeXml(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "");
    const title = field("title");
    const url = field("link");
    const published = field("pubDate");
    return { externalId: field("guid") || url || title, title, url, summary: field("description"), publishedAt: published || null };
  }).filter((item) => item.title);
}
