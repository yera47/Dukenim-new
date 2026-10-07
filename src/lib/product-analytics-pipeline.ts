import{productAnalyticsEvent,type ProductAnalyticsEvent}from"../../shared/product-analytics";

export type StoredSyntheticAnalyticsEvent=ProductAnalyticsEvent&{source:"synthetic";tenant_id:"synthetic-tenant";occurred_at:string};
export type HeatmapCell={x:number;y:number;count:number;intensity:number};
export type SyntheticAnalyticsSnapshot={events:readonly StoredSyntheticAnalyticsEvent[];cells:HeatmapCell[];sessions:number;screenViews:number;actions:number};

export function productAnalyticsCollectionEnabled(env:Record<string,string|undefined>=process.env){return env.PRODUCT_ANALYTICS_ENABLED==="true";}

export class SyntheticAnalyticsStore{
  #events:StoredSyntheticAnalyticsEvent[]=[];
  ingest(input:StoredSyntheticAnalyticsEvent){if(input.source!=="synthetic"||input.tenant_id!=="synthetic-tenant")throw new Error("Only synthetic analytics fixtures are accepted.");this.#events.push(Object.freeze({...input}));}
  snapshot(screenId:string,grid=5):SyntheticAnalyticsSnapshot{
    const scoped=this.#events.filter(item=>item.screen_id===screenId),counts=new Map<string,number>();
    for(const event of scoped){if(event.x_milli===null||event.y_milli===null)continue;const x=Math.min(grid-1,Math.floor(event.x_milli/1001*grid)),y=Math.min(grid-1,Math.floor(event.y_milli/1001*grid)),key=`${x}:${y}`;counts.set(key,(counts.get(key)??0)+1);}
    const max=Math.max(1,...counts.values()),cells:Array<HeatmapCell>=[];for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){const count=counts.get(`${x}:${y}`)??0;cells.push({x,y,count,intensity:count/max});}
    return{events:Object.freeze([...scoped]),cells,sessions:new Set(scoped.map(item=>item.session_id)).size,screenViews:scoped.filter(item=>item.event_kind==="screen_view").length,actions:scoped.filter(item=>item.event_kind==="action").length};
  }
}

export function syntheticAnalyticsFixture(){
  const store=new SyntheticAnalyticsStore(),points=[[55,90],[210,120],[198,118],[330,170],[205,420],[205,420],[205,420],[92,650],[298,710]] as const;
  points.forEach(([x,y],index)=>{const normalized=productAnalyticsEvent({eventKind:index<2?"screen_view":"action",platform:"web",surface:"merchant",sessionId:`synthetic-${1+index%3}`,screenId:"merchant.analytics",actionId:index<2?undefined:`fixture.action.${index}`,layoutVersion:"analytics-prototype-v1",viewportWidth:390,viewportHeight:844,x,y});if(!normalized)throw new Error("Invalid synthetic analytics fixture.");store.ingest({...normalized,source:"synthetic",tenant_id:"synthetic-tenant",occurred_at:new Date(Date.UTC(2026,9,7,12,index)).toISOString()});});
  return store;
}

export function acceptLiveAnalyticsEvent(){return{accepted:false as const,reason:"collection-not-mounted" as const};}
