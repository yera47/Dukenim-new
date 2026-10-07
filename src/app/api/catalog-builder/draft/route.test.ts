import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(()=>({session:vi.fn(),client:vi.fn(),entitlement:vi.fn()}));
vi.mock("@/lib/auth",()=>({getSessionContext:mocks.session}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.client}));
vi.mock("@/lib/plan-access",()=>({tenantEntitlement:mocks.entitlement}));
import {GET,PUT} from "./route";
const state={step:1,catalogName:"Серик Шоп",templateKey:"atelier",paletteKey:"mono",brief:"Магазин одежды"};
function request(body: unknown){return new Request("https://example.test/api/catalog-builder/draft",{method:"PUT",body:JSON.stringify(body)});}
describe("private builder drafts",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({user:{id:"owner"},role:"owner",tenantId:"mine"});
    mocks.entitlement.mockResolvedValue({active:true});
  });
  function db(data:unknown,error:unknown=null){
    const chain={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),update:vi.fn().mockReturnThis(),insert:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data,error}),single:vi.fn().mockResolvedValue({data,error})};
    mocks.client.mockResolvedValue({from:vi.fn().mockReturnValue(chain)});return chain;
  }
  it("loads only the session tenant and disables shared caching",async()=>{
    const chain=db({revision:3,state}); const response=await GET();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect((await response.json()).draft.state).toEqual(state);
    expect(chain.eq).toHaveBeenCalledWith("tenant_id","mine");
  });
  it("rejects unauthenticated and tenantless access",async()=>{
    mocks.session.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await PUT(request({revision:0,state}))).status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("rejects injected tenant and arbitrary state fields",async()=>{
    expect((await PUT(request({revision:0,state,tenantId:"victim"}))).status).toBe(400);
    expect((await PUT(request({revision:0,state:{...state,html:"<script>"}}))).status).toBe(400);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("uses atomic revision comparison for an update",async()=>{
    const chain=db({revision:4});
    expect((await PUT(request({revision:3,state}))).status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("revision",3);
    expect(chain.eq).toHaveBeenCalledWith("tenant_id","mine");
  });
  it("does not overwrite a newer revision",async()=>{
    db(null);expect((await PUT(request({revision:3,state}))).status).toBe(409);
  });
  it("handles two first saves as a conflict",async()=>{
    db(null,{code:"23505"});expect((await PUT(request({revision:0,state}))).status).toBe(409);
  });
  it("does not save for an expired subscription",async()=>{
    mocks.entitlement.mockResolvedValue({active:false});
    expect((await PUT(request({revision:0,state}))).status).toBe(403);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("serializes two clients that save the same revision",async()=>{
    let persisted={revision:3,state};
    mocks.client.mockImplementation(async()=>({from:()=>{
      let fields:{revision:number;state:typeof state}|null=null;
      let tenant:string|undefined;
      let revision:number|undefined;
      const chain={
        update:vi.fn((value:{revision:number;state:typeof state})=>{fields=value;return chain;}),
        eq:vi.fn((field:string,value:string|number)=>{if(field==="tenant_id")tenant=String(value);if(field==="revision")revision=Number(value);return chain;}),
        select:vi.fn(()=>chain),
        maybeSingle:vi.fn(async()=>{
          if(tenant!=="mine"||revision!==persisted.revision||!fields)return{data:null,error:null};
          persisted={revision:fields.revision,state:fields.state};
          return{data:{revision:persisted.revision},error:null};
        }),
      };
      return chain;
    }}));
    const clientA={...state,brief:"client A"};
    const clientB={...state,brief:"client B"};
    const responses=await Promise.all([PUT(request({revision:3,state:clientA})),PUT(request({revision:3,state:clientB}))]);
    expect(responses.map(response=>response.status).sort()).toEqual([200,409]);
    expect(persisted.revision).toBe(4);
    expect(["client A","client B"]).toContain(persisted.state.brief);
  });
});
