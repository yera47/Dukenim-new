import { notFound } from "next/navigation";
import { commerceConfigurations, configurationFor } from "@/lib/commerce-configurations";
import { demoProductsFor } from "@/lib/demo-catalogs";
import { configurationSlug } from "@/lib/storefront-path";
import { nichePresets } from "@/lib/niche-presets";
import { StoreHome } from "@/components/store/store-home";
export function generateStaticParams(){return commerceConfigurations.map(({vertical,approach})=>({vertical,approach}));}
export default async function ConfigurationDemo({params}:{params:Promise<{vertical:string;approach:string}>}) {
  const {vertical,approach}=await params;
  const config=configurationFor(vertical,approach);if(!config)notFound();
  const products=demoProductsFor(config.vertical),slug=configurationSlug(config.vertical,config.approach);
  const name=`Dukenim ${config.vertical=== "other"?"Shop":config.vertical[0].toUpperCase()+config.vertical.slice(1)+" Shop"}`;
  return <StoreHome slug={slug} tenant={{name,catalog_name:name,tagline:nichePresets[config.vertical].headline,business_vertical:config.vertical}} products={products} settings={null} campaign={null} storePolicies={null} approach={config.approach}/>;
}
