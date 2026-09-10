import {createHmac,timingSafeEqual} from "node:crypto";
import {z} from "zod";
export const guestOrdersCookie="dukenim_orders";
const entry=z.object({id:z.string().uuid(),tenant:z.string().uuid(),expires:z.number().int()});
export type GuestOrder=z.infer<typeof entry>;
export function signGuestOrders(orders:GuestOrder[],secret:string){
 if(!secret)throw new Error("Missing signing key");
 const body=Buffer.from(JSON.stringify(orders.slice(-20))).toString("base64url");
 return body+"."+createHmac("sha256",secret).update("guest-orders-v1:"+body).digest("base64url");
}
export function readGuestOrders(value:string|undefined,secret:string,now=Date.now()):GuestOrder[]{
 if(!value||!secret||value.length>4000)return [];
 try{const[body,signature,...extra]=value.split(".");if(extra.length||!body||!signature)return [];
 const expected=createHmac("sha256",secret).update("guest-orders-v1:"+body).digest();const actual=Buffer.from(signature,"base64url");
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return [];
 const parsed=z.array(entry).max(20).safeParse(JSON.parse(Buffer.from(body,"base64url").toString()));
 return parsed.success?parsed.data.filter(order=>order.expires>now):[];
 }catch{return [];}
}
