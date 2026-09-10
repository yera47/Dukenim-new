export type StockFilter="all"|"available"|"low"|"empty"|"missing-sku";
export function filterStock<T extends {product_id:string;stock_qty:number;sku:string|null;size:string|null;color:string|null}>(variants:T[],products:{id:string;title:string}[],query:string,filter:string):T[]{
 const names=new Map(products.map(product=>[product.id,product.title]));
 const words=query.trim().toLocaleLowerCase("ru").split(/\s+/).filter(Boolean);
 return variants.filter(variant=>{
  const text=[names.get(variant.product_id),variant.sku,variant.size,variant.color].filter(Boolean).join(" ").toLocaleLowerCase("ru");
  if(!words.every(word=>text.includes(word)))return false;
  if(filter==="available")return variant.stock_qty>0;
  if(filter==="low")return variant.stock_qty>0&&variant.stock_qty<3;
  if(filter==="empty")return variant.stock_qty===0;
  if(filter==="missing-sku")return !variant.sku?.trim();
  return true;
 });
}
