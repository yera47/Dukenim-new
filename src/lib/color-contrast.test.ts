import {expect,it} from "vitest";
import {contrastInk} from "./color-contrast";
it.each([['#ffffff','#000000'],['#ffff00','#000000'],['#000000','#ffffff'],['#123456','#ffffff']])('readable foreground for %s',(color,ink)=>expect(contrastInk(color)).toBe(ink));
