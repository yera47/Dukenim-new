import {expect,it} from "vitest";
import {azureMessageSchema} from "./message-input";
it('accepts text and one embedded PNG only',()=>{
  expect(azureMessageSchema.safeParse({role:'user',content:[{type:'text',text:'Логотип'},{type:'image_url',image_url:{url:'data:image/png;base64,YWJj'}}]}).success).toBe(true);
});
it.each(['https://example.com/image.png','http://169.254.169.254/metadata','data:text/html;base64,YWJj'])('rejects external or unsupported visual input %s',url=>{
  expect(azureMessageSchema.safeParse({role:'user',content:[{type:'text',text:'Логотип'},{type:'image_url',image_url:{url}}]}).success).toBe(false);
});
it('rejects oversized text and images in system role',()=>{
  expect(azureMessageSchema.safeParse({role:'user',content:'a'.repeat(12001)}).success).toBe(false);
  expect(azureMessageSchema.safeParse({role:'system',content:[{type:'text',text:'x'},{type:'image_url',image_url:{url:'data:image/png;base64,YWJj'}}]}).success).toBe(false);
});
