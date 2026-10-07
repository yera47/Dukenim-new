export const analyticsEventKinds=["session_start","screen_view","action","funnel_step","session_end"] as const;
export type AnalyticsEventKind=typeof analyticsEventKinds[number];
export type AnalyticsPlatform="web"|"ios"|"android";
export type AnalyticsSurface="buyer"|"merchant";

export type ProductAnalyticsEvent={
  event_kind:AnalyticsEventKind;
  platform:AnalyticsPlatform;
  surface:AnalyticsSurface;
  session_id:string;
  screen_id:string;
  action_id:string|null;
  funnel_id:string|null;
  step_id:string|null;
  layout_version:string;
  viewport_width:number;
  viewport_height:number;
  x_milli:number|null;
  y_milli:number|null;
};

const idPattern=/^[a-z0-9][a-z0-9_.-]{0,63}$/;
const cleanId=(value:string|null|undefined,required=false)=>{if(!value)return required?null:null;return idPattern.test(value)?value:null;};
const dimension=(value:number)=>Number.isFinite(value)&&value>=240&&value<=10000?Math.round(value):null;
const milli=(point:number|undefined,size:number)=>point===undefined?null:Math.max(0,Math.min(1000,Math.round(point/size*1000)));

export function productAnalyticsEvent(input:{eventKind:AnalyticsEventKind;platform:AnalyticsPlatform;surface:AnalyticsSurface;sessionId:string;screenId:string;actionId?:string;funnelId?:string;stepId?:string;layoutVersion:string;viewportWidth:number;viewportHeight:number;x?:number;y?:number}):ProductAnalyticsEvent|null{
  const width=dimension(input.viewportWidth),height=dimension(input.viewportHeight),screen=cleanId(input.screenId,true),layout=cleanId(input.layoutVersion,true);
  if(!width||!height||!screen||!layout||!cleanId(input.sessionId,true))return null;
  return{event_kind:input.eventKind,platform:input.platform,surface:input.surface,session_id:input.sessionId,screen_id:screen,action_id:cleanId(input.actionId),funnel_id:cleanId(input.funnelId),step_id:cleanId(input.stepId),layout_version:layout,viewport_width:width,viewport_height:height,x_milli:milli(input.x,width),y_milli:milli(input.y,height)};
}

// Deliberately no arbitrary payload/message/value field: inputs, passwords, chats,
// payment data and customer text cannot enter this contract.
