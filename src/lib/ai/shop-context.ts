// Only known merchant facts enter the model. Keep valid JSON and a bounded size;
// never cut JSON in the middle of a value or include credentials/unknown fields.
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max:number)=>typeof v==="string"?v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,"").slice(0,max):null;
export function compactShopContext(value:unknown) {
 const root=object(value),brand=object(root.brand),fulfilment=object(root.fulfilment),pickup=object(fulfilment.pickup_location),reservation=object(root.reservation),location=object(reservation.location);
 return JSON.stringify({
  name:text(root.name,80),catalog_name:text(root.catalog_name,80),business_vertical:text(root.business_vertical,40),catalog_status:text(root.catalog_status,30),
  brand:{notes:text(brand.notes,2500),colors:Array.isArray(brand.colors)?brand.colors.filter(v=>typeof v==="string"&&/^#[a-f\d]{6}$/i.test(v)).slice(0,6):[]},
  reservation:{enabled:typeof reservation.enabled==="boolean"?reservation.enabled:null,hold_hours:typeof reservation.hold_hours==="number"&&Number.isInteger(reservation.hold_hours)&&reservation.hold_hours>=1&&reservation.hold_hours<=72?reservation.hold_hours:null,location:{address:text(location.address,300),hours:text(location.hours,200)}},
  fulfilment:{delivery_enabled:typeof fulfilment.delivery_enabled==="boolean"?fulfilment.delivery_enabled:null,pickup_enabled:typeof fulfilment.pickup_enabled==="boolean"?fulfilment.pickup_enabled:null,min_order:typeof fulfilment.min_order==="number"&&Number.isSafeInteger(fulfilment.min_order)?fulfilment.min_order:null,
   pickup_location:{address:text(pickup.address,300),hours:text(pickup.hours,200),preparation:text(pickup.preparation,200),instructions:text(pickup.instructions,500)}}
 });
}
export function parseModelJson(content:string):unknown {
 const trimmed=content.trim();
 const fenced=/^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed);
 return JSON.parse(fenced?fenced[1]:trimmed);
}
