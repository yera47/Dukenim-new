import { describe,it,expect } from "vitest";
import sharp from "sharp";
import {prepareBrandLogo} from "./brand-image";
describe("private logo processing",()=>{
  it("extracts a real dominant colour and outputs bounded PNG",async()=>{
    const input=await sharp({create:{width:32,height:32,channels:4,background:{r:240,g:0,b:0,alpha:1}}}).png().toBuffer();
    const result=await prepareBrandLogo(input);
    expect(result.colors[0]).toBe("#f00000");
    expect((await sharp(result.png).metadata()).format).toBe("png");
  });
  it("rejects SVG instead of processing active/remote content",async()=>{
    await expect(prepareBrandLogo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"></svg>'))).rejects.toThrow();
  });
  it("rejects corrupt image",async()=>{await expect(prepareBrandLogo(Buffer.from("not a logo"))).rejects.toThrow();});
});
