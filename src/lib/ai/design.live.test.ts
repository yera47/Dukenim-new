import { expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { createAiStudioDesign } from "./studio";
import { themeVariations } from "../custom-store-theme";

it.skipIf(process.env.RUN_AZURE_DESIGN_TEST!=="1")("actual deployment returns individual pink/green design",async()=>{
  const result=await createAiStudioDesign("Серик Шоп: косметика для повседневного ухода. Нежно-розовый фон #f7dce6, светлые розовые карточки #fff3f7 и тёмно-зелёные кнопки #164a36. Сохрани именно эти цвета.","beauty","standard",{catalog_status:"not_started"}).catch(error=>{throw new Error(error.code??error.message);});
  expect(result.design.colorTheme).toEqual({background:"#f7dce6",surface:"#fff3f7",accent:"#164a36"});
  expect(themeVariations(result.design.colorTheme!)).toHaveLength(3);
  expect(result.design.sections!.length).toBeGreaterThanOrEqual(2);
},60000);
