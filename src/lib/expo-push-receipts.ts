import {z} from 'zod';
export const savedTicketsSchema=z.array(z.object({id:z.string().min(1).max(200),deviceId:z.string().uuid()})).max(100);
const ticketSchema=z.object({status:z.enum(['ok','error']),id:z.string().min(1).max(200).optional(),details:z.object({error:z.string().optional()}).optional()});
export function readPushTickets(value:unknown,devices:{id:string}[]) {
  const parsed=z.object({data:z.array(ticketSchema).max(100)}).safeParse(value);
  if(!parsed.success||parsed.data.data.length!==devices.length)throw new Error('Invalid ticket response');
  const tickets:{id:string;deviceId:string}[]=[];const invalid:string[]=[];
  for(const [index,ticket] of parsed.data.data.entries()) {
    if(ticket.status==='ok'&&ticket.id)tickets.push({id:ticket.id,deviceId:devices[index].id});
    else if(ticket.details?.error==='DeviceNotRegistered')invalid.push(devices[index].id);
  }
  return {tickets,invalid,partial:tickets.length!==devices.length};
}
export function readPushReceipts(value:unknown,tickets:z.infer<typeof savedTicketsSchema>,expired:boolean) {
  const parsed=z.object({data:z.record(z.string(),ticketSchema)}).safeParse(value);
  if(!parsed.success)throw new Error('Invalid receipt response');
  const invalid:string[]=[];let failed=false;let missing=tickets.length===0;
  for(const ticket of tickets) {
    const receipt=parsed.data.data[ticket.id];
    if(!receipt){missing=true;continue;}
    if(receipt.status==='error')failed=true;
    if(receipt.details?.error==='DeviceNotRegistered')invalid.push(ticket.deviceId);
  }
  return {state:failed?'failed':missing?(expired?'unknown':'pending'):'accepted',invalid} as const;
}
