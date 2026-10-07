import { StoryEditor, type EditorStory } from "@/app/admin/catalog/stories/story-editor";
import { demoProductsFor, redChocoberryDemoSettings } from "@/lib/demo-catalogs";
import {approachForTemplate} from "@/lib/commerce-configurations";
import {templateCatalog} from "@/lib/storefront-theme";
import { storefrontStyle } from "@/lib/storefront-style";
import demoBrandAssets from "../../../../shared/demo-brand-assets.json";

const storyTitles=["Новинка недели","Как выбрать","За кулисами","Любимое сочетание"];

export default async function StoryEditorDemo({searchParams}:{searchParams:Promise<{family?:string;template?:string}>}){
  const {family,template}=await searchParams;
  const approach=family==="assortment"?"assortment":family==="guided"?"guided":"collection";
  const requestedTemplate=templateCatalog.find(item=>item.key===template&&approachForTemplate(item.key)===approach)?.key;
  const template_key=requestedTemplate??(approach==="assortment"?"market":approach==="guided"?"studio":"gallery");
  const products=demoProductsFor("flowers");
  const stories:EditorStory[]=products.slice(0,4).map((product,index)=>({id:`synthetic-story-${index}`,title:storyTitles[index],caption:"Синтетическая сторис для локальной UX-проверки",media_path:`synthetic/demo-${index}.jpg`,media_type:"image",product_id:product.id,status:"published",sort_order:index,url:product.images?.[0]??""}));
  return <main className="min-h-screen bg-[var(--surface-2)] p-4 sm:p-8"><div className="mx-auto max-w-6xl"><p className="mb-5 rounded-full bg-white px-4 py-2 text-center text-xs font-bold uppercase tracking-wider">Синтетический редактор preview · без сохранения данных</p><StoryEditor tenantId="synthetic-tenant" stories={stories} products={products} storeName="Rose Studio · демо" storeTagline="Синтетическая витрина для локальной UX-проверки" storeLogoUrl={demoBrandAssets.roseStudio} businessVertical="flowers" approach={approach} previewSettings={{...redChocoberryDemoSettings,template_key}} previewStyle={storefrontStyle(redChocoberryDemoSettings,"pro","#9B315D")}/></div></main>;
}
