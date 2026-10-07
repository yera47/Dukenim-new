import fs from "node:fs/promises";
import path from "node:path";

const origin=process.argv[2]??"http://127.0.0.1:3023";
const destination=process.argv[3]??".tmp/atelier-top-pair";
const port=Number(process.argv[4]??9340);
const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(response=>response.json());
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
async function setup(url){
  await command("Emulation.clearDeviceMetricsOverride");
  await command("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true,screenWidth:390,screenHeight:844,positionX:0,positionY:0});
  await command("Emulation.setPageScaleFactor",{pageScaleFactor:1});
  await evaluate("localStorage.clear();sessionStorage.clear();true").catch(()=>false);
  await command("Page.navigate",{url:`${origin}${url}`});await wait(3200);
  await evaluate("document.querySelector('nextjs-portal')?.remove();window.scrollTo({left:0,top:0,behavior:'instant'});true");await wait(200);
}
async function capture(name){
  const metrics=await evaluate(`(()=>{const preview=document.querySelector('[data-story-preview-scroll]');const storefront=document.querySelector('main[data-template]');return {url:location.href,viewportWidth:innerWidth,documentClientWidth:document.documentElement.clientWidth,documentScrollWidth:document.documentElement.scrollWidth,scrollX,scrollY,previewClientWidth:preview?.clientWidth??null,previewScrollWidth:preview?.scrollWidth??null,previewScrollLeft:preview?.scrollLeft??null,runtimeTemplate:storefront?.getAttribute('data-template')??null,runtimeApproach:storefront?.getAttribute('data-approach')??null,headerText:document.querySelector('header')?.innerText??null,cartText:[...document.querySelectorAll('header a')].map(node=>node.textContent?.trim()).find(text=>text==='0')??null,brokenImages:[...document.images].filter(image=>image.complete&&image.naturalWidth===0).map(image=>image.currentSrc||image.src),pendingLazyImages:[...document.images].filter(image=>!image.complete&&image.loading==='lazy').length}})()`);
  const screenshot=await command("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});
  await fs.writeFile(path.join(destination,`${name}.png`),Buffer.from(screenshot.data,"base64"));return{name,...metrics};
}

const report=[];
await setup("/demo/flowers/collection?stories=multiple&template=atelier");
await evaluate("(()=>{const bar=document.querySelector('.reference-demo-bar')?.parentElement;if(bar)bar.style.display='none';window.scrollTo({left:0,top:0,behavior:'instant'});return true})()");await wait(200);
report.push(await capture("public-atelier-top-390"));

await setup("/demo/story-editor?family=collection&template=atelier");
await evaluate("document.querySelector('section[aria-label] button.flex.w-full')?.click();true");await wait(600);
await evaluate("document.querySelector('[data-story-preview-fullscreen]')?.click();true");await wait(400);
await evaluate("(()=>{const viewport=document.querySelector('[data-story-preview-scroll]');if(viewport)viewport.scrollTo({left:0,top:0,behavior:'instant'});const close=document.querySelector('[aria-label=\"Close full-screen preview\"]');if(close)close.style.display='none';return true})()");await wait(200);
report.push(await capture("preview-atelier-top-390"));

await setup("/demo/food/collection");
await evaluate("localStorage.clear();sessionStorage.clear();location.reload();true");await wait(2400);
await evaluate("(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.includes('Доставка'));button?.click();return Boolean(button)})()");await wait(2200);
const foodImages=await evaluate(`(()=>[...document.images].map(image=>{const rect=image.getBoundingClientRect();return {src:image.getAttribute('src'),currentSrc:image.currentSrc,loading:image.loading,complete:image.complete,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,inViewport:rect.bottom>0&&rect.top<innerHeight}}))()`);

const output={renderer:{preview:"StoryEditor -> StoreHeader + StoreHome",public:"DemoLayout/ConfigurationDemo -> StoreHeader + StoreHome",configuration:"redChocoberryDemoSettings with template_key=atelier"},captures:report,foodImagesAfterModalClose:foodImages};
await fs.writeFile(path.join(destination,"metrics.json"),JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));socket.close();
