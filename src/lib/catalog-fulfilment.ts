import { z } from "zod";
import { pickupLocationSchema } from "./pickup-location";

// Drafts accept incomplete answers. The final commit uses the stricter schema below.
export const fulfilmentDraftSchema=z.object({
  reservation:z.boolean().default(false),holdHours:z.number().int().min(1).max(72).default(24),
  delivery:z.boolean(),pickup:z.boolean(),deliveryProvider:z.enum(["own","yandex"]).default("own"),zone:z.string().max(100),cost:z.string().max(12),eta:z.string().max(200),
  address:z.string().max(300),hours:z.string().max(200),preparation:z.string().max(200),
  gisUrl:z.string().max(1500),yandexUrl:z.string().max(1500),
}).strict();
export type FulfilmentDraft=z.infer<typeof fulfilmentDraftSchema>;
export const emptyFulfilment:FulfilmentDraft={reservation:false,holdHours:24,delivery:false,pickup:false,deliveryProvider:"own",zone:"",cost:"",eta:"",address:"",hours:"",preparation:"После подтверждения готовности продавцом в разделе «Мои заказы»",gisUrl:"",yandexUrl:""};
export const paymentPreferenceSchema=z.enum(["later","freedompay","halyk","kaspi"]);
export const fulfilmentCommitSchema=fulfilmentDraftSchema.superRefine((value,ctx)=>{
  if(!value.delivery&&!value.pickup&&!value.reservation)ctx.addIssue({code:"custom",message:"Выберите доставку, самовывоз или бронь.",path:["delivery"]});
  if(value.delivery){
    if(value.zone.trim().length<2||value.eta.trim().length<2)ctx.addIssue({code:"custom",message:"Укажите зону и срок доставки.",path:["zone"]});
    if(value.deliveryProvider==="own"&&(!/^\d+$/.test(value.cost)||!Number.isSafeInteger(Number(value.cost))||Number(value.cost)>2_000_000_000))ctx.addIssue({code:"custom",message:"Стоимость своей доставки — целое число тенге от 0.",path:["cost"]});
    if(value.deliveryProvider==="yandex"&&value.cost!=="0")ctx.addIssue({code:"custom",message:"Цена Яндекс Доставки определяется после заказа. Не указывайте фиксированную стоимость.",path:["cost"]});
  }
  if(value.pickup||value.reservation){
    const point=pickupLocationSchema.safeParse({address:value.address,hours:value.hours,preparation:value.preparation,gisUrl:value.gisUrl,yandexUrl:value.yandexUrl,instructions:"",embedUrl:""});
    if(!point.success){
      const field=String(point.error.issues[0]?.path[0]??"address");
      const messages:Record<string,string>={address:"Укажите адрес самовывоза: город, улицу и дом.",hours:"Выберите дни и часы работы.",preparation:"Укажите, когда покупатель сможет забрать заказ.",gisUrl:"Проверьте ссылку 2ГИС: вставьте HTTPS-ссылку на точку.",yandexUrl:"Проверьте ссылку Яндекс Карт или Навигатора: вставьте HTTPS-ссылку на точку."};
      ctx.addIssue({code:"custom",message:messages[field]??"Проверьте условия самовывоза.",path:[field]});
    }
  }
});
