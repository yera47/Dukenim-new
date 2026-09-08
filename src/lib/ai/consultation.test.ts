import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>vi.fn());
vi.mock("server-only",()=>({}));
vi.mock("./azure-foundry",()=>({createAzureFoundryChatCompletion:mock,AzureFoundryError:class extends Error {}}));
import { createConsultation } from "./consultation";
describe("consultation context and safe output",()=>{
  beforeEach(()=>vi.clearAllMocks());
  it("passes persisted turns in order and includes the current shop",async()=>{
    mock.mockResolvedValue({content:JSON.stringify({reply:"Какой стиль вам ближе?",task:null}),usage:{}});
    await createConsultation("Светлый",{name:"Серик Шоп"},[{id:"1",message:"Одежда",response:{reply:"Какой стиль?",task:null}}]);
    const messages=mock.mock.calls[0][0];
    expect(messages.map((m:{role:string})=>m.role)).toEqual(["system","user","assistant","user"]);
    expect(messages[0].content).toContain("Серик Шоп");
    expect(messages[1].content).toBe("Одежда");
    expect(messages[3].content).toBe("Светлый");
  });
  it.each(["not JSON",JSON.stringify({reply:"Удалю магазин",task:{intent:"delete_tenant",brief:"delete everything"}})])("rejects unsupported output",async content=>{
    mock.mockResolvedValue({content});
    await expect(createConsultation("Помоги",{},[])).rejects.toThrow();
  });
});
