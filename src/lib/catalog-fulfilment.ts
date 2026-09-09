import { z } from "zod";
import { pickupLocationSchema } from "./pickup-location";

// Drafts accept incomplete answers. The final commit uses the stricter schema below.
export const fulfilmentDraftSchema=z.object({
  delivery:z.boolean(),pickup:z.boolean(),zone:z.string().max(100),cost:z.string().max(12),eta:z.string().max(200),
  address:z.string().max(300),hours:z.string().max(200),preparation:z.string().max(200),
  gisUrl:z.string().max(1500),yandexUrl:z.string().max(1500),
}).strict();
export type FulfilmentDraft=z.infer<typeof fulfilmentDraftSchema>;
export const emptyFulfilment:FulfilmentDraft={delivery:false,pickup:false,zone:"",cost:"",eta:"",address:"",hours:"",preparation:"",gisUrl:"",yandexUrl:""};
export const paymentPreferenceSchema=z.enum(["later","freedompay","halyk","kaspi"]);
export const fulfilmentCommitSchema=fulfilmentDraftSchema.superRefine((value,ctx)=>{
  if(!value.delivery&&!value.pickup)ctx.addIssue({code:"custom",message:"Выберите доставку или самовывоз.",path:["delivery"]});
  if(value.delivery){
    if(value.zone.trim().length<2||value.eta.trim().length<2)ctx.addIssue({code:"custom",message:"Укажите зону и срок доставки.",path:["zone"]});
    if(!/^\d+$/.test(value.cost)||!Number.isSafeInteger(Number(value.cost))||Number(value.cost)>2_000_000_000)ctx.addIssue({code:"custom",message:"Стоимость доставки — целое число тенге от 0.",path:["cost"]});
  }
  if(value.pickup&&!pickupLocationSchema.safeParse({address:value.address,hours:value.hours,preparation:value.preparation,gisUrl:value.gisUrl,yandexUrl:value.yandexUrl,instructions:"",embedUrl:""}).success)
    ctx.addIssue({code:"custom",message:"Укажите адрес, часы, готовность самовывоза и корректные ссылки на карты.",path:["address"]});
});
