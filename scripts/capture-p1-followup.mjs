import fs from "node:fs/promises";
import path from "node:path";

const origin=process.argv[2]??"http://127.0.0.1:3015";
const destination=process.argv[3]??".tmp/p1-followup";
const port=Number(process.argv[4]??9340);
const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(response=>response.json());
const target=targets.find(item=>item.type==="page"&&item.url.startsWith(origin))??targets.find(item=>item.type==="page");
if(!target?.webSocketDebuggerUrl)throw new Error("No local browser target");
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
let id=0;const pending=new Map();
socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data));const item=pending.get(message.id);if(!item)return;pending.delete(message.id);message.error?item.reject(new Error(message.error.message)):item.resolve(message.result);});
const command=(method,params={})=>new Promise((resolve,reject)=>{const commandId=++id;pending.set(commandId,{resolve,reject});socket.send(JSON.stringify({id:commandId,method,params}));});
const evaluate=async expression=>(await command("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true})).result.value;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

await fs.mkdir(destination,{recursive:true});
await command("Page.enable");await command("Runtime.enable");

async function setup(url,width=390,height=844){
  await command("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<700,screenWidth:width,screenHeight:height});
  await command("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  await evaluate("localStorage.clear();sessionStorage.clear();true").catch(()=>false);
  await command("Page.navigate",{url:`${origin}${url}`});await wait(4000);
  if(!(await evaluate(`location.href.startsWith(${JSON.stringify(origin)})`))){await command("Page.navigate",{url:`${origin}${url}`});await wait(4000);}
  await evaluate("document.querySelector('nextjs-portal')?.remove();true");
}
async function capture(name){
  const metrics=await evaluate(`(()=>({url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollY,cart:[...document.querySelectorAll('a,button')].map(node=>node.textContent?.trim()).find(text=>text?.includes('Корзина'))??null,headerImages:document.querySelectorAll('header img').length,headerText:document.querySelector('header')?.innerText??null,orders:[...document.querySelectorAll('a')].filter(link=>link.textContent?.includes('Заказы')).length,brokenImages:[...document.images].filter(image=>!image.complete||image.naturalWidth===0).length,dialog:Boolean(document.querySelector('[role=dialog],dialog[open]')),providerButton:[...document.querySelectorAll('button')].find(button=>button.textContent?.includes('Подтвердить смету'))?.disabled??null}))()`);
  const shot=await command("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});
  await fs.writeFile(path.join(destination,`${name}.png`),Buffer.from(shot.data,"base64"));
  return{name,...metrics};
}

const report=[];

await setup("/demo/story-editor?family=collection");
await evaluate("document.querySelector('section[aria-label] button.flex.w-full')?.click();true");await wait(800);
await evaluate("document.querySelector('[data-story-preview-fullscreen]')?.click();true");await wait(500);
await evaluate("(()=>{const viewport=document.querySelector('[data-story-preview-scroll]');if(viewport)viewport.scrollTo({top:0,behavior:'instant'});const close=document.querySelector('[aria-label=\"Close full-screen preview\"]');if(close)close.style.display='none';return true})()");
report.push(await capture("preview-flowers-gallery-390"));

await setup("/demo/flowers/collection?stories=multiple&template=gallery");
await evaluate("(()=>{const bar=document.querySelector('.reference-demo-bar')?.parentElement;if(bar)bar.style.display='none';window.scrollTo(0,0);return true})()");
report.push(await capture("public-flowers-gallery-390"));

for(const width of [390,1440]){
  await setup("/demo/flowers/collection?stories=multiple&template=gallery",width,width===390?844:900);
  await evaluate("(()=>{const bar=document.querySelector('.reference-demo-bar')?.parentElement;if(bar)bar.style.display='none';document.querySelector('#catalog')?.scrollIntoView({block:'start'});return true})()");await wait(300);
  report.push(await capture(`catalog-toolbar-${width}`));
}

await setup("/demo/fashion/guided?template=signature");
await evaluate("window.scrollTo(0,0);true");
report.push(await capture("signature-spacing-390"));

await setup("/demo/food/collection");
await evaluate("localStorage.clear();sessionStorage.clear();location.reload();true");await wait(2400);
report.push(await capture("food-choice-aligned-390"));

await setup("/demo/brand-kit");
await evaluate("(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.includes('Создать оформление'));button?.scrollIntoView({block:'center',behavior:'instant'});return Boolean(button)})()");await wait(250);
report.push(await capture("brand-kit-filled-cta-390"));
await evaluate("(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.includes('Создать оформление'));button?.click();return Boolean(button)})()");await wait(250);
await evaluate("(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.includes('Подтвердить смету'));button?.scrollIntoView({block:'center',behavior:'instant'});return Boolean(button)})()");await wait(250);
report.push(await capture("brand-kit-prepared-no-provider-390"));

await fs.writeFile(path.join(destination,"metrics.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
socket.close();
