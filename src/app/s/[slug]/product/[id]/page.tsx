import{notFound}from"next/navigation";import{ProductDetail}from"@/components/store/product-detail";import{products}from"@/lib/demo-data";
export default async function ProductPage({params}:{params:Promise<{slug:string;id:string}>}){const{slug,id}=await params;const product=products.find(p=>p.id===id);if(!product)notFound();return <ProductDetail product={product} slug={slug}/>}
