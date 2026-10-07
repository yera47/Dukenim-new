import { notFound } from "next/navigation";
import { commerceConfigurations, configurationFor } from "@/lib/commerce-configurations";
import { approvedConceptDemoNames, approvedConceptDemoSettings, bulkaDemoSettings, demoProductsFor, redChocoberryDemoSettings } from "@/lib/demo-catalogs";
import { configurationSlug } from "@/lib/storefront-path";
import { nichePresets } from "@/lib/niche-presets";
import { StoreHome } from "@/components/store/store-home";
import type { StoreStory } from "@/lib/food-stories";
import { templateCatalog } from "@/lib/storefront-theme";

export function generateStaticParams() { return commerceConfigurations.map(({ vertical, approach }) => ({ vertical, approach })); }
const storyTitles: Record<string, string[]> = { food: ["Новинки", "Завтраки", "Из печи", "Выбор недели"], fashion: ["Образ в деталях", "Крой и пространство", "Материалы", "В наличии"] };

export default async function ConfigurationDemo({ params, searchParams }: { params: Promise<{ vertical: string; approach: string }>; searchParams: Promise<{ stories?: string; template?: string }> }) {
  const { vertical, approach } = await params;
  const { stories: storyMode, template } = await searchParams;
  const config = configurationFor(vertical, approach);
  if (!config) notFound();
  const products = demoProductsFor(config.vertical);
  const slug = configurationSlug(config.vertical, config.approach);
  const bulkaFixture = config.vertical === "food" && config.approach === "collection";
  const name = approvedConceptDemoNames[config.vertical] ?? (bulkaFixture ? "Bulka · демо" : `Dukenim ${config.vertical === "other" ? "Shop" : `${config.vertical[0].toUpperCase()}${config.vertical.slice(1)} Shop`}`);
  const storyCount = storyMode === "multiple" ? Math.min(4, products.length) : storyMode === "on" || storyMode === "error" ? 1 : 0;
  const titles = storyTitles[config.vertical] ?? ["Новинки", "Материалы", "За кулисами", "Выбор команды"];
  const demoStories: StoreStory[] = products.slice(0, storyCount).flatMap((product, index) => product.images?.[0] ? [{ id: `synthetic-story-${index}`, title: titles[index], caption: "Синтетический контент для визуальной UX-проверки", mediaUrl: storyMode === "error" ? "/synthetic-missing-story-media.jpg" : product.images[0], mediaType: "image" as const, productId: product.id }] : []);
  const baseSettings = approvedConceptDemoSettings[config.vertical] ?? (bulkaFixture ? bulkaDemoSettings : null);
  const settings = template && templateCatalog.some((item) => item.key === template) ? { ...(baseSettings ?? redChocoberryDemoSettings), template_key: template, ...(!baseSettings ? { layout_config: null, hero_image_url: null, hero_title: null, hero_subtitle: null, hero_cta_label: "Открыть каталог" } : null) } : baseSettings;
  return <StoreHome slug={slug} tenant={{ name, catalog_name: name, tagline: nichePresets[config.vertical].headline, business_vertical: config.vertical }} products={products} settings={settings} campaign={null} storePolicies={null} approach={config.approach} checkoutOptions={config.vertical === "food" ? { deliveryEnabled: true, pickupEnabled: true } : undefined} foodStories={demoStories} approvedConceptPreview={Boolean(approvedConceptDemoSettings[config.vertical])} />;
}
