export type ProductDraftPhoto = {
  uri: string;
  fileName?: string | null;
  fileSize?: number;
  mimeType?: string;
  width: number;
  height: number;
};

export type ProductDraft = {
  version: 1;
  tenantId: string;
  title: string;
  description: string;
  price: string;
  oldPrice: string;
  stock: string;
  sku: string;
  categoryId: string | null;
  isActive: boolean;
  ingredients: string;
  weight: string;
  kcal: string;
  protein: string;
  fat: string;
  carbs: string;
  photos: ProductDraftPhoto[];
};

export const productDraftStorageKey = (tenantId: string) => `dukenim_product_draft_v1:${tenantId}`;

export function emptyProductDraft(tenantId: string): ProductDraft {
  return {version:1,tenantId,title:"",description:"",price:"",oldPrice:"",stock:"",sku:"",categoryId:null,isActive:true,ingredients:"",weight:"",kcal:"",protein:"",fat:"",carbs:"",photos:[]};
}

const bounded = (value: unknown, max: number) => typeof value === "string" && value.length <= max ? value : null;
const numeric = (value: unknown, max: number) => {
  const parsed=bounded(value,max);
  return parsed!==null && /^\d*(?:\.\d*)?$/.test(parsed) ? parsed : null;
};

export function parseProductDraft(raw: string | null, tenantId: string): ProductDraft | null {
  if (!raw) return null;
  try {
    const value=JSON.parse(raw) as Record<string,unknown>;
    if(value.version!==1||value.tenantId!==tenantId||typeof value.isActive!=="boolean")return null;
    const title=bounded(value.title,120),description=bounded(value.description,1200),price=numeric(value.price,10),oldPrice=numeric(value.oldPrice,10),stock=numeric(value.stock,7),sku=bounded(value.sku,80),ingredients=bounded(value.ingredients,1200),weight=numeric(value.weight,8),kcal=numeric(value.kcal,8),protein=numeric(value.protein,8),fat=numeric(value.fat,8),carbs=numeric(value.carbs,8);
    if([title,description,price,oldPrice,stock,sku,ingredients,weight,kcal,protein,fat,carbs].some(item=>item===null))return null;
    if(value.categoryId!==null&&typeof value.categoryId!=="string")return null;
    if(!Array.isArray(value.photos)||value.photos.length>5)return null;
    const photos=value.photos.map(photo=>{
      if(!photo||typeof photo!=="object")return null;
      const item=photo as Record<string,unknown>;
      if(typeof item.uri!=="string"||!item.uri||item.uri.length>2500||typeof item.width!=="number"||typeof item.height!=="number")return null;
      return {uri:item.uri,fileName:typeof item.fileName==="string"?item.fileName:null,fileSize:typeof item.fileSize==="number"?item.fileSize:undefined,mimeType:typeof item.mimeType==="string"?item.mimeType:undefined,width:item.width,height:item.height} satisfies ProductDraftPhoto;
    });
    if(photos.some(photo=>photo===null))return null;
    return {version:1,tenantId,title:title!,description:description!,price:price!,oldPrice:oldPrice!,stock:stock!,sku:sku!,categoryId:value.categoryId as string|null,isActive:value.isActive,ingredients:ingredients!,weight:weight!,kcal:kcal!,protein:protein!,fat:fat!,carbs:carbs!,photos:photos as ProductDraftPhoto[]};
  } catch { return null; }
}
