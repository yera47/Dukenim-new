import fs from "node:fs/promises";
import path from "node:path";

const origin=process.argv[2]??"http://127.0.0.1:3012";
const destination=process.argv[3]??"output/buyer-journey-final";
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

await fs.mkdir(destination,{recursive:true});
await command("Page.enable");await command("Runtime.enable");
await command("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true,screenWidth:390,screenHeight:844});
await command("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});

async function go(route){await command("Page.navigate",{url:`${origin}${route}`});await wait(2600);await evaluate("document.fonts.ready.then(()=>true)");await evaluate("document.querySelector('nextjs-portal')?.remove();true");}
async function capture(name){const metrics=await evaluate(`(()=>({name:${JSON.stringify(name)},url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,scrollY,brokenImages:[...document.images].filter(image=>!image.complete||image.naturalWidth===0).length,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches}))()`);const png=await command("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});await fs.writeFile(path.join(destination,`${name}-390.png`),Buffer.from(png.data,"base64"));return metrics;}
async function clickAt(expression){const point=await evaluate(`(()=>{const node=${expression};if(!node)return null;node.scrollIntoView({block:'center'});const rect=node.getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+rect.height/2}})()`);if(!point)throw new Error("Click target not found");await command("Input.dispatchMouseEvent",{type:"mousePressed",x:point.x,y:point.y,button:"left",clickCount:1});await command("Input.dispatchMouseEvent",{type:"mouseReleased",x:point.x,y:point.y,button:"left",clickCount:1});}

await go("/demo/fashion/collection/product/p1");
await evaluate("localStorage.clear();sessionStorage.clear();true");
await command("Page.reload");await wait(2200);await evaluate("document.querySelector('nextjs-portal')?.remove();true");
const report=[await capture("product")];
await evaluate("window.scrollTo(0,document.documentElement.scrollHeight);true");await wait(250);
report.push(await capture("product-seller-delivery"));
await clickAt("[...document.querySelectorAll('[data-product-information] button')].find(button=>button.textContent?.trim()==='M')");await wait(800);
const added=await evaluate("(()=>{const button=document.querySelector('[data-product-information] .btn-secondary');if(!button||button.disabled)return {ok:false,buttons:[...document.querySelectorAll('[data-product-information] button')].map(item=>({text:item.textContent?.trim(),disabled:item.disabled,className:item.className}))};button.click();return {ok:true}})()");
if(!added.ok)throw new Error(`Product variant was not ready to add: ${JSON.stringify(added.buttons)}`);
await wait(800);
await go("/demo/fashion/collection/cart");
report.push(await capture("cart"));
await go("/demo/fashion/collection/checkout");
report.push(await capture("checkout"));
await fs.writeFile(path.join(destination,"metrics.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
socket.close();
