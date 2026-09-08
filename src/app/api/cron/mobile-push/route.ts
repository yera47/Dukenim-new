import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readPushTickets, readPushReceipts, savedTicketsSchema } from "@/lib/expo-push-receipts";

export const maxDuration = 60;
const headers=()=>({"content-type":"application/json",accept:"application/json",...(process.env.EXPO_ACCESS_TOKEN?{Authorization:`Bearer ${process.env.EXPO_ACCESS_TOKEN}`}:{})});

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client=createAdminClient(),now=Date.now();
  // A crashed sender may already have sent a notification. Do not blindly resend it.
  const recovery=await client.from('mobile_notification_outbox').update({status:'failed',receipt_state:'unknown',last_error:'Sender interrupted; delivery outcome unknown'})
    .eq('status','processing').or(`claimed_at.lt.${new Date(now-120000).toISOString()},claimed_at.is.null`);
  if(recovery.error)return NextResponse.json({error:'Unable to recover notification queue'},{status:503});
  let receiptsChecked=0;
  const waiting=await client.from('mobile_notification_outbox').select('id,user_id,expo_tickets,sent_at,last_error')
    .eq('status','sent').eq('receipt_state','pending').lte('sent_at',new Date(now-15*60000).toISOString()).order('sent_at').limit(5);
  if(waiting.error)return NextResponse.json({error:'Unable to read push receipts'},{status:503});
  const batches=(waiting.data??[]).map(row=>({row,tickets:savedTicketsSchema.safeParse(row.expo_tickets)}));
  const ids=batches.flatMap(batch=>batch.tickets.success?batch.tickets.data.map(ticket=>ticket.id):[]);
  if(batches.length){
    try {
      const response=ids.length?await fetch('https://exp.host/--/api/v2/push/getReceipts',{method:'POST',headers:headers(),body:JSON.stringify({ids}),signal:AbortSignal.timeout(8000),cache:'no-store'}):null;
      if(response&&!response.ok)throw new Error('Receipt provider unavailable');
      const payload:unknown=response?await response.json():{data:{}};
      for(const {row,tickets} of batches){
        const expired=!row.sent_at||now-new Date(row.sent_at).getTime()>24*60*60000;
        const result=tickets.success?readPushReceipts(payload,tickets.data,expired):{state:'unknown' as const,invalid:[]};
        if(result.invalid.length) {
          const disabled=await client.from('mobile_device_tokens').update({enabled:false}).eq('user_id',row.user_id).in('id',result.invalid);
          if(disabled.error)throw new Error('Unable to disable invalid device');
        }
        const update=await client.from('mobile_notification_outbox').update({receipt_state:result.state,last_error:result.state==='failed'?'Push provider rejected delivery':result.state==='unknown'?'Push receipt unavailable':row.last_error}).eq('id',row.id).eq('receipt_state','pending');
        if(update.error)throw new Error('Unable to store receipt');
        receiptsChecked++;
      }
    } catch {
      return NextResponse.json({error:'Push receipt check not completed',receiptsChecked},{status:503});
    }
  }
  const pending=await client.from('mobile_notification_outbox').select('id,tenant_id,user_id,title,body,data,attempts')
    .eq('status','pending').lte('deliver_after',new Date(now).toISOString()).order('created_at').limit(4);
  if(pending.error)return NextResponse.json({error:'Unable to read notification queue'},{status:503});
  let acceptedByExpo=0,failed=0;
  for(const notification of pending.data??[]){
    const claim=await client.from('mobile_notification_outbox').update({status:'processing',claimed_at:new Date().toISOString()}).eq('id',notification.id).eq('status','pending').select('id').maybeSingle();
    if(claim.error||!claim.data)continue;
    let providerAccepted=false;
    try {
      const member=await client.from('tenant_users').select('id').eq('tenant_id',notification.tenant_id).eq('user_id',notification.user_id).eq('role','owner').maybeSingle();
      if(member.error||!member.data)throw new Error('Recipient no longer authorized');
      const devices=await client.from('mobile_device_tokens').select('id,token').eq('user_id',notification.user_id).eq('enabled',true).limit(100);
      if(devices.error||!devices.data?.length)throw new Error('No registered device');
      const response=await fetch('https://exp.host/--/api/v2/push/send',{
        method:'POST',headers:headers(),body:JSON.stringify(devices.data.map(device=>({to:device.token,sound:'default',title:notification.title,body:notification.body,data:notification.data,channelId:'orders',priority:'high'}))),
        cache:'no-store',signal:AbortSignal.timeout(8000),
      });
      if(!response.ok)throw new Error('Provider unavailable');
      providerAccepted=true;
      const result=readPushTickets(await response.json(),devices.data);
      if(result.invalid.length){
        const disabled=await client.from('mobile_device_tokens').update({enabled:false}).eq('user_id',notification.user_id).in('id',result.invalid);
        if(disabled.error)throw new Error('Device update failed');
      }
      const saved=await client.from('mobile_notification_outbox').update({status:result.tickets.length?'sent':'failed',sent_at:result.tickets.length?new Date().toISOString():null,expo_tickets:result.tickets,receipt_state:result.tickets.length?'pending':'failed',last_error:result.partial?'Some devices were rejected by Expo':null}).eq('id',notification.id).eq('status','processing');
      if(saved.error)throw new Error('Ticket save failed');
      if(result.tickets.length)acceptedByExpo++;else failed++;
    }catch(error){
      const attempts=Math.min(3,notification.attempts+1);
      const uncertain=providerAccepted||(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name));
      const saved=await client.from('mobile_notification_outbox').update({status:uncertain||attempts>=3?'failed':'pending',attempts,receipt_state:uncertain?'unknown':'pending',deliver_after:new Date(Date.now()+attempts*5*60000).toISOString(),last_error:uncertain?'Delivery outcome unknown; automatic resend stopped':'Push not accepted; check device registration'}).eq('id',notification.id).eq('status','processing');
      if(saved.error)return NextResponse.json({error:'Unable to persist notification outcome'},{status:503});
      failed++;
    }
  }
  return NextResponse.json({ok:true,acceptedByExpo,receiptsChecked,failed},{headers:{'Cache-Control':'no-store'}});
}
