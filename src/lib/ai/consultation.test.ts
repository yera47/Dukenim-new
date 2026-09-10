import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>vi.fn());
vi.mock("server-only",()=>({}));
vi.mock("./azure-foundry",()=>({createAzureFoundryChatCompletion:mock,AzureFoundryError:class extends Error {}}));
import { createConsultation } from "./consultation";
describe("consultation context and safe output",()=>{
  it("returns only allowlisted help destinations",async()=>{
    mock.mockResolvedValue({content:JSON.stringify({reply:"Откройте заявку на оплату.",task:null,help:"payments"})});
    expect((await createConsultation("Подключи оплату",{},[])).consultation.help).toBe("payments");
    mock.mockResolvedValue({content:JSON.stringify({reply:"Откройте ссылку",task:null,help:"https://evil.example"})});
    await expect(createConsultation("Помоги",{},[])).rejects.toThrow();
  });
  it("fits even escaped merchant text into the transport limit",async()=>{
    mock.mockResolvedValue({content:'{"reply":"Готов предложить оформление.","task":null}'});
    const huge='"\\\n\u0001'.repeat(9000);
    await createConsultation("Жёлтый магазин",{name:huge,catalog_name:huge,brand:{notes:huge},fulfilment:{pickup_location:{address:huge,hours:huge,preparation:huge,instructions:huge}}},[]);
    expect(mock.mock.calls.at(-1)?.[0][0].content.length).toBeLessThanOrEqual(12000);
  });
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
