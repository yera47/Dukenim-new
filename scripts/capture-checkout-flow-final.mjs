import fs from "node:fs/promises";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3013";
const destination = process.argv[3] ?? "output/checkout-flow-final-20261007";
const targets = await fetch("http://127.0.0.1:9340/json/list").then(response => response.json());
const target = targets.find(item => item.type === "page");
if (!target?.webSocketDebuggerUrl) throw new Error("No local browser target");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let id = 0;
const pending = new Map();
socket.addEventListener("message", event => { const message = JSON.parse(String(event.data)); const item = pending.get(message.id); if (!item) return; pending.delete(message.id); message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result); });
const command = (method, params = {}) => new Promise((resolve, reject) => { const commandId = ++id; pending.set(commandId, { resolve, reject }); socket.send(JSON.stringify({ id: commandId, method, params })); });
const evaluate = async expression => (await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

await fs.mkdir(destination, { recursive: true });
await command("Page.enable");
await command("Runtime.enable");
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
async function go(route) { await command("Page.navigate", { url: `${origin}${route}` }); await wait(2400); await evaluate("document.fonts.ready.then(()=>true)"); await evaluate("document.querySelector('nextjs-portal')?.remove();true"); }
async function capture(name) { const metrics = await evaluate(`(()=>({name:${JSON.stringify(name)},url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,step:[...document.querySelectorAll('section h1')].at(-1)?.textContent,brokenImages:[...document.images].filter(image=>!image.complete||image.naturalWidth===0).length,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches}))()`); const png = await command("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false }); await fs.writeFile(path.join(destination, `${name}-390.png`), Buffer.from(png.data, "base64")); return metrics; }
async function click(selectorExpression) { const ok = await evaluate(`(()=>{const node=${selectorExpression};if(!node)return false;node.scrollIntoView({block:'center'});node.click();return true})()`); if (!ok) throw new Error(`Click target not found: ${selectorExpression}`); await wait(650); }

await go("/demo/fashion/collection/product/p1");
await evaluate("localStorage.clear();sessionStorage.clear();true");
await command("Page.reload"); await wait(1800);
await click("[...document.querySelectorAll('[data-product-information] button')].find(button=>button.textContent?.trim()==='M')");
await click("document.querySelector('[data-product-information] .btn-secondary')");
await go("/demo/fashion/collection/checkout");
const report = [await capture("checkout-contacts")];
await evaluate(`(()=>{const set=(node,value)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));};set(document.querySelector('input[autocomplete="name"]'),'Алия');set(document.querySelector('input[type="tel"]'),'+7 777 000 00 00');const consent=document.querySelector('input[type="checkbox"]');if(consent&&!consent.checked)consent.click();return true})()`);
await wait(250);
await click("[...document.querySelectorAll('button.btn-cta')].at(-1)");
report.push(await capture("checkout-fulfilment"));
await click("[...document.querySelectorAll('label')].find(label=>label.textContent?.includes('Самовывоз'))");
report.push(await capture("checkout-pickup-selected"));
await click("[...document.querySelectorAll('button.btn-cta')].at(-1)");
report.push(await capture("checkout-review"));
await click("[...document.querySelectorAll('button.btn-cta')].at(-1)");
await wait(900);
report.push(await capture("checkout-success"));
await fs.writeFile(path.join(destination, "metrics.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
socket.close();
