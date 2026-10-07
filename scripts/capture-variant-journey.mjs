import fs from "node:fs/promises";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3013";
const destination = process.argv[3] ?? ".tmp/variant-journey";
const targets = await fetch("http://127.0.0.1:9340/json/list").then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target?.webSocketDebuggerUrl) throw new Error("No local browser target");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let id = 0;
const pending = new Map();
socket.addEventListener("message", (event) => { const message = JSON.parse(String(event.data)); const item = pending.get(message.id); if (!item) return; pending.delete(message.id); if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result); });
const command = (method, params = {}) => new Promise((resolve, reject) => { const commandId = ++id; pending.set(commandId, { resolve, reject }); socket.send(JSON.stringify({ id: commandId, method, params })); });
const evaluate = async (expression) => (await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await fs.mkdir(destination, { recursive: true });
await command("Page.enable");
await command("Runtime.enable");
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

async function go(route) {
  await command("Page.navigate", { url: `${origin}${route}` });
  await wait(2400);
  await evaluate("document.fonts.ready.then(() => true)");
  await evaluate("document.querySelector('nextjs-portal')?.remove();true");
}
async function shot(name) {
  const metrics = await evaluate(`(() => ({name:${JSON.stringify(name)},url:location.href,scrollWidth:document.documentElement.scrollWidth,brokenImages:[...document.images].filter((image)=>!image.complete||image.naturalWidth===0).length,text:document.body.innerText.includes('Графит · M')}))()`);
  const png = await command("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await fs.writeFile(path.join(destination, `${name}-390.png`), Buffer.from(png.data, "base64"));
  return metrics;
}

await go("/demo/fashion/collection/product/p1");
await evaluate("localStorage.clear();true");
await command("Page.reload");
await wait(1800);
await evaluate(`(() => { const heading=[...document.querySelectorAll('b')].find((node)=>node.textContent?.includes('Выберите размер')); heading?.scrollIntoView({block:'center'}); return true; })()`);
await wait(250);
const report = [await shot("product-selection-required")];
await evaluate(`(() => { const button=[...document.querySelectorAll('button')].find((node)=>node.textContent?.trim()==='M'); button?.click(); return Boolean(button); })()`);
await wait(250);
report.push(await shot("product-variant-selected"));
await evaluate(`(() => { const button=[...document.querySelectorAll('button')].find((node)=>node.textContent?.includes('В корзину')); button?.click(); return Boolean(button); })()`);
await wait(300);
await go("/demo/fashion/collection/cart");
report.push(await shot("cart-variant"));
await go("/demo/fashion/collection/checkout");
report.push(await shot("checkout-variant"));
await fs.writeFile(path.join(destination, "metrics.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
socket.close();
