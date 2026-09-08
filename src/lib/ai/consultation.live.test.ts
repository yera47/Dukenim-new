import { expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { createConsultation } from "./consultation";
// Explicit opt-in only. Uses the existing deployment, with synthetic shop facts.
it.skipIf(process.env.RUN_AZURE_LIVE_TEST!=="1")("existing Azure deployment returns a valid conversational response",async()=>{
  const result=await createConsultation("Хочу светлый магазин с крупными фото",{name:"Серик Шоп",business_vertical:"fashion",catalog_status:"not_started"},[{id:"test",message:"Магазин Серик Шоп, продаём повседневную одежду",response:{reply:"Какой стиль витрины вам нравится?",task:null}}]);
  expect(result.consultation.reply.length).toBeGreaterThan(0);
  expect(result.consultation.task===null||["hero","store_design","catalog_structure","promotion"].includes(result.consultation.task.intent)).toBe(true);
},60000);
