const port=Number(process.argv[2]??9340);
const origin=process.argv[3]??"http://127.0.0.1:3011";
const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(response=>response.json());
const target=targets.find(item=>item.type==="page"&&item.url.startsWith("http://127.0.0.1"));
if(!target?.webSocketDebuggerUrl)throw new Error("No safe local browser target is available");
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
let nextId=0;const pending=new Map();socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data));const callback=pending.get(message.id);if(!callback)return;pending.delete(message.id);message.error?callback.reject(new Error(message.error.message)):callback.resolve(message.result);});
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>(await command("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true})).result.value;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const navigate=async(path,width=390)=>{await command("Emulation.setDeviceMetricsOverride",{width,height:844,deviceScaleFactor:1,mobile:width<700,screenWidth:width,screenHeight:844});await command("Page.navigate",{url:`${origin}${path}`});await wait(2500);await evaluate("document.querySelector('nextjs-portal')?.remove();document.querySelector('[role=dialog] button:last-child')?.click();true");};
const clickText=text=>evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.trim()===${JSON.stringify(text)});button?.click();return Boolean(button)})()`);
const clickIncludes=text=>evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.includes(${JSON.stringify(text)}));button?.click();return Boolean(button)})()`);
const fillSearch=async value=>{await evaluate(`(()=>{const input=document.querySelector('input[type=search]');if(!input)return false;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,${JSON.stringify(value)});input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:${JSON.stringify(value)}}));return true})()`);await wait(250);};

await command("Page.enable");await command("Runtime.enable");
await navigate("/demo/flowers/collection");
assert(await evaluate("document.querySelectorAll('[aria-label=\"Истории магазина\"]').length")===0,"Stories-off must render no rail");
assert(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"),"Mobile collection overflows");

await navigate("/demo/food/assortment?stories=multiple");
assert(await evaluate("document.querySelectorAll('[aria-label=\"Истории магазина\"] button').length")===4,"Four published fixture stories expected");
await evaluate("document.querySelector('[aria-label=\"Истории магазина\"] button')?.click();true");await wait(200);
assert(await evaluate("Boolean(document.querySelector('dialog[open]'))"),"Story viewer did not open");
await command("Input.dispatchKeyEvent",{type:"rawKeyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await command("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape",windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await wait(150);
assert(!(await evaluate("Boolean(document.querySelector('dialog[open]'))")),"Story viewer did not close on Escape");

assert(await clickText("Поиск"),"Search button missing");await wait(100);await fillSearch("Кофе");
assert(await evaluate("document.querySelectorAll('.food-menu-card').length")===1,"Search query should leave one food card");
assert(await evaluate("document.querySelector('[aria-label=\"Очистить поиск\"]')?.click();true"),"Clear search control missing");await wait(150);
assert(await evaluate("document.querySelectorAll('.food-menu-card').length")===5,"Clear search should restore all food cards");
await evaluate("document.querySelector('[aria-label=\"Закрыть поиск\"]')?.click();true");await wait(100);
assert(!(await evaluate("Boolean(document.querySelector('input[type=search]'))")),"Search should close when empty");

assert(await clickIncludes("Фильтры"),"Filter button missing");await wait(100);
await evaluate(`(()=>{const select=document.querySelector('#food-filters select');if(!select)return false;select.value=select.options[1].value;select.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);await wait(100);
assert(await clickText("Применить"),"Apply filters missing");await wait(180);
assert(await evaluate("document.querySelectorAll('.food-menu-card').length")===2,"Category filter should leave two food cards");
assert(await clickIncludes("Фильтры"),"Filter reopen missing");await wait(100);assert(await clickText("Сбросить"),"Reset filters missing");await wait(100);assert(await clickText("Применить"),"Apply reset missing");await wait(180);
assert(await evaluate("document.querySelectorAll('.food-menu-card').length")===5,"Filter reset should restore all food cards");

assert(await clickText("Поиск"),"Search reopen missing");await wait(100);await fillSearch("нет-такого-товара");
assert(await evaluate("document.body.innerText.includes('Ничего не найдено')"),"No-results state missing");
assert(await clickText("Показать всё меню"),"No-results reset missing");await wait(150);
assert(await evaluate("document.querySelectorAll('.food-menu-card').length")===5,"No-results reset should restore catalog");

await command("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
await navigate("/demo/home/guided?stories=on");
await evaluate("document.querySelector('[aria-label=\"Истории магазина\"] button')?.click();true");await wait(150);
assert(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"),"Reduced motion emulation missing");
assert(await evaluate("getComputedStyle(document.querySelector('dialog[open] i')).animationName==='none'"),"Story progress animation must be disabled under reduced motion");

await navigate("/demo/story-editor");await evaluate("document.querySelector('section.space-y-3 > button')?.click();true");await wait(600);await evaluate("(()=>{const editor=document.querySelector('section.card');[...editor.querySelectorAll('button.btn-primary')].at(-1)?.click();return true})()");await wait(250);
assert(await evaluate("document.body.innerText.includes('Опубликовать именно этот вариант?')"),"Publish confirmation missing");
assert(await clickText("Отмена"),"Publish cancel missing");await wait(150);
assert(!(await evaluate("document.body.innerText.includes('Опубликовать именно этот вариант?')")),"Cancel must close confirmation without publishing");

await navigate("/demo/food/assortment?stories=multiple",1440);
assert(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"),"Desktop assortment overflows");
console.log("PASS stories off/on/multiple, viewer Escape, search open/query/clear/close, filters apply/reset, no-results reset, reduced motion, publish cancel, 390/1440 overflow");socket.close();
