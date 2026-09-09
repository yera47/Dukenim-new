import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { TemplateIllustration } from "./template-illustration";
import { launchVerticals } from "@/lib/launch-verticals";
afterEach(()=>vi.unstubAllGlobals());
it.each(launchVerticals)("shows labelled populated examples for $id",({id})=>{
 vi.stubGlobal("React",React);
 const editorial=renderToStaticMarkup(<TemplateIllustration vertical={id} compact={false}/>);
 const catalog=renderToStaticMarkup(<TemplateIllustration vertical={id} compact/>);
 expect(editorial).toContain("В центре внимания");
 expect(catalog).toContain("Найти товар");
 expect(editorial).toContain("не товары вашего магазина");
 expect((catalog.match(/<img /g)||[]).length).toBeGreaterThanOrEqual(3);
});
