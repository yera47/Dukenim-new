import { expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { createConsultation } from "./consultation";
import sharp from "sharp";
it.skipIf(process.env.RUN_AZURE_PDF_VISION_TEST!=="1")("reads a selected brandbook page without claiming a saved design",async()=>{
  const pink=await sharp({create:{width:300,height:400,channels:3,background:'#ffc0cb'}}).png().toBuffer();
  const green=await sharp({create:{width:150,height:400,channels:3,background:'#006400'}}).png().toBuffer();
  const png=await sharp(pink).composite([{input:green,left:150,top:0}]).png().toBuffer();
  const result=await createConsultation("На этой одной странице два цвета. Назови их на русском. Остальные страницы не анализируй.",{},[],png,"brandbook_page");
  expect(result.consultation.task).toBeNull();
  expect(result.consultation.reply.toLowerCase()).toMatch(/розов/);
  expect(result.consultation.reply.toLowerCase()).toMatch(/зел[её]н/);
},60000);
it.skipIf(process.env.RUN_AZURE_VISION_TEST!=="1")("existing Azure deployment reads actual image input",async()=>{
  const png=await sharp({create:{width:128,height:128,channels:3,background:'#0000ff'}}).png().toBuffer();
  const result=await createConsultation("Какой основной цвет на прикреплённом изображении? Назови только цвет, пока без действий.",{name:"Тестовый магазин"},[],png);
  expect(result.consultation.reply.toLowerCase()).toMatch(/син|blue/);
},60000);
// Explicit opt-in only. Uses the existing deployment, with synthetic shop facts.
it.skipIf(process.env.RUN_AZURE_LIVE_TEST!=="1")("existing Azure deployment returns a valid conversational response",async()=>{
  const result=await createConsultation("Хочу светлый магазин с крупными фото",{name:"Серик Шоп",business_vertical:"fashion",catalog_status:"not_started"},[{id:"test",message:"Магазин Серик Шоп, продаём повседневную одежду",response:{reply:"Какой стиль витрины вам нравится?",task:null}}]);
  expect(result.consultation.reply.length).toBeGreaterThan(0);
  expect(result.consultation.task===null||["hero","store_design","catalog_structure","promotion"].includes(result.consultation.task.intent)).toBe(true);
},60000);
