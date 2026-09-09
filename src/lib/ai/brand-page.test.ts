import {beforeEach,expect,it,vi} from "vitest";
import sharp from "sharp";
const call=vi.hoisted(()=>vi.fn());
vi.mock("server-only",()=>({}));
vi.mock("./azure-foundry",()=>({createAzureFoundryChatCompletion:call,AzureFoundryError:class extends Error{}}));
import {createConsultation} from "./consultation";
import {aiStudioRequestSchema} from "./studio";
import {prepareBrandPage} from "../brand-image";
beforeEach(()=>call.mockReset());
it("accepts only bounded inline pages for consultation, not arbitrary URLs",()=>{
  const base={intent:"consultation",brief:"Разобрать страницу"};
  expect(aiStudioRequestSchema.safeParse({...base,brandPage:"data:image/jpeg;base64,/9j/aaaa"}).success).toBe(true);
  for(const value of ["https://private.internal/image","data:image/svg+xml;base64,aaaa","a".repeat(900001)])expect(aiStudioRequestSchema.safeParse({...base,brandPage:value}).success).toBe(false);
  expect(aiStudioRequestSchema.safeParse({...base,includeBrandLogo:true,brandPage:"data:image/jpeg;base64,aaaa"}).success).toBe(false);
  expect(aiStudioRequestSchema.safeParse({...base,intent:"store_design",brandPage:"data:image/jpeg;base64,aaaa"}).success).toBe(false);
});
it("re-encodes an actual JPEG and rejects disguised markup",async()=>{
  const jpeg=await sharp({create:{width:200,height:300,channels:3,background:"pink"}}).jpeg().toBuffer();
  const png=await prepareBrandPage(jpeg);expect((await sharp(png).metadata()).format).toBe("png");
  await expect(prepareBrandPage(Buffer.from("<svg/>"))).rejects.toThrow();
});
it("uses a page-specific prompt without unrelated merchant/history facts",async()=>{
  call.mockResolvedValue({content:JSON.stringify({reply:"На выбранной странице розовый фон. Остальные страницы не рассмотрены.",task:null})});
  await createConsultation("Страница 2",{private:"excluded"},[{id:"1",message:"excluded",response:{reply:"excluded",task:null}}],Buffer.from("png"),"brandbook_page");
  const messages=call.mock.calls[0][0];expect(messages).toHaveLength(2);expect(JSON.stringify(messages)).not.toContain("excluded");expect(messages[0].content).toContain("одну выбранную страницу");
});
it("rejects executable task output from page analysis",async()=>{
  call.mockResolvedValue({content:JSON.stringify({reply:"Изменим дизайн",task:{intent:"store_design",brief:"Изменить дизайн магазина"}})});
  await expect(createConsultation("Страница",{},[],Buffer.from("png"),"brandbook_page")).rejects.toThrow();
});
