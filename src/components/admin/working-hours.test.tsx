import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {expect,it,vi} from "vitest";
import {WorkingHours} from "./working-hours";
it("offers seven explicit days without inventing opening hours",()=>{
  const html=renderToStaticMarkup(<WorkingHours value="" onChange={vi.fn()}/>);
  expect((html.match(/type="checkbox"/g)??[])).toHaveLength(7);
  expect(html).not.toContain("checked=");
  expect(html).toContain("Отметьте рабочие дни");
});
it("preserves legacy saved hours until the owner chooses to edit",()=>{
  const change=vi.fn();
  const html=renderToStaticMarkup(<WorkingHours value="По будням с 9 до 18" onChange={change}/>);
  expect(html).toContain("По будням с 9 до 18");
  expect(html).toContain("Изменить расписание");
  expect(change).not.toHaveBeenCalled();
});
