import {BrandKitStudio} from "@/components/admin/brand-kit-studio";

const syntheticCategories=[
  {id:"synthetic-bakery",name:"Выпечка"},
  {id:"synthetic-desserts",name:"Десерты"},
  {id:"synthetic-drinks",name:"Напитки"},
];

export default function BrandKitDemoPage(){
  return <main className="min-h-screen bg-[#f5efe8] px-3 py-6 text-[#2b1a10] sm:px-6 sm:py-10">
    <div className="mx-auto max-w-6xl">
      <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Локальная демонстрация на синтетических данных. Генератор и платные вызовы отключены.
      </p>
      <BrandKitStudio
        tenantId="synthetic-brand-kit-demo"
        vertical="food"
        categories={syntheticCategories}
        storeName="Bulka · Демо"
        slug="demo-food-collection"
        logoReferenceId="logo:synthetic-demo"
        providerAvailable={false}
        remainingOutputs={12}
      />
    </div>
  </main>;
}
