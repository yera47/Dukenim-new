import fs from "node:fs/promises";
import path from "node:path";

const origin=process.argv[2]??"http://127.0.0.1:3015";
const destination=process.argv[3]??".tmp/brand-kit-final";
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
async function setup(url,width=390,height=844){await command("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<700,screenWidth:width,screenHeight:height});await command("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});await command("Page.navigate",{url:`${origin}${url}`});await wait(2400);await evaluate("window.scrollTo(0,0);document.querySelector('nextjs-portal')?.remove();true");}
async function capture(name,width){const metrics=await evaluate(`(()=>({url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,template:document.querySelector('main[data-template]')?.getAttribute('data-template')??null,dialogs:document.querySelectorAll('[role=dialog],dialog[open]').length,brokenImages:[...document.images].filter(image=>!image.complete||image.naturalWidth===0).length,buttons:[...document.querySelectorAll('button')].slice(0,20).map(button=>button.textContent?.trim()).filter(Boolean)}))()`);const shot=await command("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});await fs.writeFile(path.join(destination,`${name}-${width}.png`),Buffer.from(shot.data,"base64"));return{name,...metrics};}

const report=[];
for(const width of [390,1440]){await setup("/demo/brand-kit",width,width===390?844:900);report.push(await capture("brand-kit",width));}
await setup("/demo/fashion/guided?template=signature",390,844);report.push(await capture("signature",390));
await setup("/demo/fashion/collection?stories=multiple",390,844);await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.getAttribute('aria-label')?.includes('Открыть историю'));button?.click();return Boolean(button)})()`);await wait(350);report.push(await capture("story-viewer",390));

await setup("/demo/food/collection",390,844);await evaluate("localStorage.clear();sessionStorage.clear();location.reload();true");await wait(2200);report.push(await capture("food-fulfilment-choice",390));
await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.includes('Доставка'));button?.click();window.scrollTo(0,0);return Boolean(button)})()`);await wait(350);await evaluate("window.scrollTo(0,0);true");report.push(await capture("food-delivery-selected",390));
await evaluate("localStorage.clear();sessionStorage.clear();location.reload();true");await wait(2200);
await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.includes('Самовывоз'));button?.click();window.scrollTo(0,0);return Boolean(button)})()`);await wait(1000);await evaluate("window.scrollTo(0,0);true");report.push(await capture("food-pickup-selected",390));

await fs.writeFile(path.join(destination,"metrics.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));socket.close();
