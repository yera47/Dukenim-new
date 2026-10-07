import fs from "node:fs/promises";
import path from "node:path";

const origin=process.argv[2]??"http://127.0.0.1:3013";
const destination=process.argv[3]??".tmp/design-audit";
const targets=await fetch("http://127.0.0.1:9340/json/list").then(response=>response.json());
const target=targets.find(item=>item.type==="page");
if(!target?.webSocketDebuggerUrl)throw new Error("No local browser target");
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
let id=0;const pending=new Map();
socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data));const item=pending.get(message.id);if(!item)return;pending.delete(message.id);message.error?item.reject(new Error(message.error.message)):item.resolve(message.result);});
const command=(method,params={})=>new Promise((resolve,reject)=>{const commandId=++id;pending.set(commandId,{resolve,reject});socket.send(JSON.stringify({id:commandId,method,params}));});
const evaluate=async expression=>(await command("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true})).result.value;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await fs.mkdir(destination,{recursive:true});await command("Page.enable");await command("Runtime.enable");
async function setup(url,width=390,height=844){await command("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<700,screenWidth:width,screenHeight:height});await command("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});await command("Page.navigate",{url:`${origin}${url}`});await wait(2200);await evaluate("window.scrollTo(0,0);document.querySelector('nextjs-portal')?.remove();true");}
async function capture(name,width){const metrics=await evaluate(`(()=>({url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,runtimeTemplate:document.querySelector('main[data-template]')?.getAttribute('data-template')??null,brokenImages:[...document.images].filter(image=>!image.complete||image.naturalWidth===0).length,dialogs:[...document.querySelectorAll('[role=dialog],dialog[open]')].length}))()`);const shot=await command("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});await fs.writeFile(path.join(destination,`${name}-${width}.png`),Buffer.from(shot.data,"base64"));return{name,...metrics};}
const report=[];
const templates=[
  ["atelier","collection"],["journal","collection"],["gallery","collection"],
  ["market","assortment"],["studio","guided"],["signature","guided"],
];
for(const [template,approach] of templates){for(const width of [390,1440]){await setup(`/demo/fashion/${approach}?template=${template}`,width,width===390?844:900);report.push(await capture(`template-${template}-top`,width));}}
await setup("/demo/fashion/collection?stories=multiple",390,844);report.push(await capture("fashion-stories-rail",390));await evaluate("document.querySelector('button[aria-label^=\"Открыть историю\"]')?.click();true");await wait(300);report.push(await capture("fashion-stories-viewer",390));
await setup("/demo/food/collection?stories=multiple",390,844);report.push(await capture("food-stories-rail",390));
await setup("/demo/food/collection",390,844);await evaluate("document.querySelector('#catalog')?.scrollIntoView({block:'start'});true");await wait(200);await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent?.includes('Фильтры'))?.click();true");await wait(250);report.push(await capture("food-filter-panel",390));
await evaluate(`(()=>{const selects=document.querySelectorAll('[role=dialog] select');if(selects[0]){selects[0].value=selects[0].options[1]?.value??'';selects[0].dispatchEvent(new Event('change',{bubbles:true}));}if(selects[1]){selects[1].value='price-desc';selects[1].dispatchEvent(new Event('change',{bubbles:true}));}return true})()`);await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent?.includes('Применить'))?.click();true");await wait(250);report.push(await capture("food-filter-selected",390));
await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent?.includes('Поиск'))?.click();true");await evaluate(`(()=>{const input=document.querySelector('#food-search');if(!input)return false;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'нет такого блюда');input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);await wait(250);report.push(await capture("food-search-empty",390));
await setup("/demo/fashion/collection",390,844);await evaluate("document.querySelector('a[href*=\"/product/\"]')?.click();true");await wait(1500);
report.push(await capture("fashion-product",390));
await setup("/demo/fashion/collection/checkout?fixture=reference",390,844);report.push(await capture("fashion-checkout",390));
await setup("/demo/photo-studio",390,844);report.push(await capture("photo-studio",390));
await setup("/demo/fashion/collection",320,720);report.push(await capture("fashion-stress-320",320));
await setup("/demo/food/collection",320,720);report.push(await capture("food-stress-320",320));
await setup("/demo/fashion/collection",390,844);await evaluate("document.documentElement.style.fontSize='200%';true");await wait(250);report.push(await capture("fashion-text-200",390));
await fs.writeFile(path.join(destination,"metrics.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));socket.close();
