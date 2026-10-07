import fs from "node:fs/promises";
import path from "node:path";

const port=Number(process.argv[2]??9340);
const origin=process.argv[3]??"http://127.0.0.1:3011";
const destination=process.argv[4]??"output/stories-search-ux";
const only=new Set((process.argv[5]??"").split(",").filter(Boolean));
const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(response=>response.json());
const target=targets.find(item=>item.type==="page"&&item.url.startsWith(origin))??targets.find(item=>item.type==="page"&&item.url.startsWith("http://127.0.0.1"));
if(!target?.webSocketDebuggerUrl)throw new Error("No safe local browser target is available");
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
let nextId=0;const pending=new Map();
socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data));const callback=pending.get(message.id);if(!callback)return;pending.delete(message.id);if(message.error)callback.reject(new Error(message.error.message));else callback.resolve(message.result);});
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const evaluate=async expression=>(await command("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true})).result.value;
const capture=async(name,url,width,height,interaction)=>{
  await command("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<700,screenWidth:width,screenHeight:height});
  await command("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:name.includes("reduced")?"reduce":"no-preference"}]});
  await evaluate("localStorage.clear();true").catch(()=>false);await command("Page.navigate",{url:`${origin}${url}`});await wait(5000);
  await evaluate("document.querySelector('nextjs-portal')?.remove();document.querySelector('[role=dialog] button:last-child')?.click();true");await wait(250);
  if(interaction==="stories")await evaluate("(()=>{const rail=document.querySelector('[aria-label=\"Истории магазина\"]');if(rail)window.scrollTo({top:rail.getBoundingClientRect().top+window.scrollY-90,behavior:'instant'});return true})()");
  if(interaction==="catalog")await evaluate("document.querySelector('#catalog')?.scrollIntoView({block:'start'});window.scrollBy(0,-70);true");
  if(interaction==="search"){await evaluate(`(()=>{document.querySelector('#catalog')?.scrollIntoView({block:'start'});window.scrollBy(0,-70);const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.includes('Поиск'));button?.click();return Boolean(button)})()`);await wait(300);if(!await evaluate("Boolean(document.querySelector('input[type=search]'))"))await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.includes('Поиск'));button?.click();return Boolean(button)})()`);}
  if(interaction==="no-results"){await evaluate(`(()=>{document.querySelector('#catalog')?.scrollIntoView({block:'start'});window.scrollBy(0,-70);const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.trim()==='Поиск');button?.click();return true})()`);await wait(180);await evaluate(`(()=>{const input=document.querySelector('input[type=search]');if(input){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'нет-такого-товара');input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'нет-такого-товара'}));}return true})()`);}
  if(interaction==="filters")await evaluate(`(()=>{document.querySelector('#catalog')?.scrollIntoView({block:'start'});window.scrollBy(0,-70);const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.includes('Фильтры'));button?.click();return true})()`);
  if(interaction==="viewer"){await evaluate("document.querySelector('[aria-label=\"Истории магазина\"] button')?.click();true");await wait(300);if(!await evaluate("Boolean(document.querySelector('dialog[open]'))"))await evaluate("document.querySelector('[aria-label=\"Истории магазина\"] button')?.click();true");}
  if(interaction==="editor-confirm"){await evaluate(`(()=>{const item=document.querySelector('section.space-y-3 button.w-full');item?.click();return Boolean(item)})()`);await wait(1000);await evaluate(`(()=>{const editor=document.querySelector('section.card');const button=editor?[...editor.querySelectorAll('button.btn-primary')].find(item=>item.textContent?.includes('Сохранить изменения')):null;button?.click();return Boolean(button)})()`);await wait(500);await evaluate(`(()=>{const publish=[...document.querySelectorAll('button.btn-primary')].find(item=>item.textContent?.trim()==='Опубликовать');publish?.scrollIntoView({block:'center',behavior:'instant'});return Boolean(publish)})()`);}
  await wait(500);
  const metrics=await evaluate(`(()=>({url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,stories:document.querySelectorAll('[aria-label="Истории магазина"] button').length,searchOpen:Boolean(document.querySelector('input[type=search]')),filterOpen:Boolean(document.querySelector('[role=dialog][aria-modal=true]')),noResults:document.body.innerText.includes('Ничего не найдено'),reduced:matchMedia('(prefers-reduced-motion: reduce)').matches}))()`);
  if(interaction==="editor-preview"){await evaluate(`(()=>{const item=document.querySelector('section.space-y-3 button.w-full');item?.click();return Boolean(item)})()`);await wait(600);await evaluate(`(()=>{const button=document.querySelector('[data-story-preview-fullscreen]');button?.click();return Boolean(button)})()`);await wait(350);await evaluate(`(()=>{const viewport=document.querySelector('[data-story-preview-scroll]');const rail=viewport?.querySelector('[aria-label="���ਨ ��������"]');const close=document.querySelector('[aria-label="Close full-screen preview"]');if(close)close.style.display='none';if(viewport&&rail){const top=rail.getBoundingClientRect().top-viewport.getBoundingClientRect().top+viewport.scrollTop;viewport.scrollTo({top:Math.max(0,top-90),behavior:'instant'});}return Boolean(rail)})()`);await wait(500);}
  if(interaction==="stories")await evaluate("(()=>{const rail=document.querySelector('section[data-placement]');if(rail)window.scrollTo({top:rail.getBoundingClientRect().top+window.scrollY-90,behavior:'instant'});return Boolean(rail)})()")
  if(interaction==="editor-preview")await evaluate("(()=>{const viewport=document.querySelector('[data-story-preview-scroll]');const rail=viewport?.querySelector('section[data-placement]');if(viewport&&rail){rail.scrollIntoView({block:'start',behavior:'instant'});viewport.scrollBy({top:-90,behavior:'instant'});}return Boolean(rail)})()")
  await wait(250);
  const image=await command("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});
  await fs.writeFile(path.join(destination,`${name}-${width}.png`),Buffer.from(image.data,"base64"));return{name,...metrics};
};

await fs.mkdir(destination,{recursive:true});await command("Page.enable");await command("Runtime.enable");
const jobs=[
  ["collection-stories-mobile","/demo/flowers/collection?stories=multiple",390,844,"stories"],
  ["assortment-stories-mobile","/demo/food/assortment?stories=multiple",390,844,"stories"],
  ["guided-stories-mobile","/demo/home/guided?stories=multiple",390,844,"stories"],
  ["stories-one-mobile","/demo/home/guided?stories=on",390,844,"stories"],
  ["story-media-error-mobile","/demo/home/guided?stories=error",390,844,"viewer"],
  ["stories-off-mobile","/demo/flowers/collection",390,844,"catalog"],
  ["search-open-mobile","/demo/food/assortment?stories=multiple",390,844,"search"],
  ["filters-mobile","/demo/food/assortment?stories=multiple",390,844,"filters"],
  ["no-results-mobile","/demo/food/assortment",390,844,"no-results"],
  ["collection-stories-desktop","/demo/flowers/collection?stories=multiple",1440,900,"stories"],
  ["assortment-filters-desktop","/demo/food/assortment?stories=multiple",1440,900,"filters"],
  ["guided-stories-desktop-reduced","/demo/home/guided?stories=multiple",1440,900,"stories"],
  ["story-editor-confirm-mobile","/demo/story-editor",390,844,"editor-confirm"],
  ["story-editor-confirm-desktop","/demo/story-editor",1440,900,"editor-confirm"],
  ["pair-collection-preview-mobile","/demo/story-editor?family=collection",390,844,"editor-preview"],
  ["pair-collection-actual-mobile","/demo/flowers/collection?stories=multiple",390,844,"stories"],
  ["pair-assortment-preview-mobile","/demo/story-editor?family=assortment",390,844,"editor-preview"],
  ["pair-assortment-actual-mobile","/demo/flowers/assortment?stories=multiple",390,844,"stories"],
  ["pair-guided-preview-mobile","/demo/story-editor?family=guided",390,844,"editor-preview"],
  ["pair-guided-actual-mobile","/demo/flowers/guided?stories=multiple",390,844,"stories"],
  ["pair-collection-preview-desktop","/demo/story-editor?family=collection",1440,900,"editor-preview"],
  ["pair-collection-actual-desktop","/demo/flowers/collection?stories=multiple",1440,900,"stories"],
  ["pair-assortment-preview-desktop","/demo/story-editor?family=assortment",1440,900,"editor-preview"],
  ["pair-assortment-actual-desktop","/demo/flowers/assortment?stories=multiple",1440,900,"stories"],
  ["pair-guided-preview-desktop","/demo/story-editor?family=guided",1440,900,"editor-preview"],
  ["pair-guided-actual-desktop","/demo/flowers/guided?stories=multiple",1440,900,"stories"],
];
const report=[];for(const job of jobs.filter(job=>only.size===0||only.has(job[0])))report.push(await capture(...job));
await fs.writeFile(path.join(destination,"metrics.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));socket.close();
