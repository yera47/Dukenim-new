import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { BrandMaterials } from "./brand-materials";

vi.mock("@/lib/pdf-brandbook-client",()=>({readBrandbookPdf:vi.fn()}));

it("embeds brand materials without a nested form or implicit wizard submit",()=>{
  const html=renderToStaticMarkup(<form><BrandMaterials embedded/></form>);
  expect(html.match(/<form/g)).toHaveLength(1);
  expect(html).toContain('role="group"');
  expect(html).toContain('type="button"');
  expect(html).not.toContain('type="submit"');
  expect(html).toContain("это не визуальный анализ брендбука");
  expect(html).toContain("Предложить оформление с AI");
});
