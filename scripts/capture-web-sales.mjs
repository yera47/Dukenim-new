import fs from "node:fs/promises";
import path from "node:path";

const origin=process.argv[2]??"http://127.0.0.1:3012";
const destination=process.argv[3]??"output/web-sales-review";
const targets=await fetch("http://127.0.0.1:9340/json/list").then(response=>response.json());
const target=targets.find(item=>item.type==="page");
if(!target?.webSocketDebuggerUrl)throw new Error("No local browser target");
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
let id=0;const pending=new Map();socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data));const item=pending.get(message.id);if(!item)return;pending.delete(message.id);message.error?item.reject(new Error(message.error.message)):item.resolve(message.result);});
const command=(method,params={})=>new Promise((resolve,reject)=>{const commandId=++id;pending.set(commandId,{resolve,reject});socket.send(JSON.stringify({id:commandId,method,params}));});
const evaluate=async expression=>(await command("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true})).result.value;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await fs.mkdir(destination,{recursive:true});await command("Page.enable");await command("Runtime.enable");
const cases=[
  ["home-pricing-mobile","/#pricing",390,844,"document.querySelector('#pricing')?.scrollIntoView({block:'start'})"],
  ["home-pricing-desktop","/#pricing",1440,900,"document.querySelector('#pricing')?.scrollIntoView({block:'start'})"],
  ["examples-mobile","/demo",390,844,"window.scrollTo(0,0)"],
  ["examples-desktop","/demo",1440,900,"window.scrollTo(0,0)"],
  ["register-premium-mobile","/register?plan=standard",390,844,"window.scrollTo(0,0)"],
];
const report=[];
for(const [name,url,width,height,scroll] of cases){
  await command("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<700,screenWidth:width,screenHeight:height});
  await command("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  await command("Page.navigate",{url:`${origin}${url}`});await wait(2200);
  await evaluate("document.querySelector('nextjs-portal')?.remove();document.querySelector('[role=dialog] button:first-of-type')?.click();true");await evaluate(`${scroll};true`);await wait(350);
  const metrics=await evaluate(`(()=>({url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,brokenImages:[...document.images].filter(image=>image.complete&&image.naturalWidth===0).length,text:document.body.innerText.slice(0,1200),pricing:document.querySelector('#pricing')?.innerText.slice(0,1200)??null}))()`);
  const image=await command("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});await fs.writeFile(path.join(destination,`${name}-${width}.png`),Buffer.from(image.data,"base64"));report.push({name,...metrics});
}
await fs.writeFile(path.join(destination,"metrics.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));socket.close();
