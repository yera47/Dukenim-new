import fs from "node:fs/promises";
import path from "node:path";

const destination = process.argv[2] ?? ".tmp/merchant-shell-v2";
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
const report = [];
for (const [name, route] of [["merchant-orders", "/orders?uiPreview=390&brand=bulka"], ["merchant-menu", "/menu?uiPreview=390&brand=bulka"]]) {
  await command("Page.navigate", { url: `http://127.0.0.1:8091${route}` });
  await wait(4200);
  await evaluate("document.fonts?.ready?.then(()=>true)??true");
  const metrics = await evaluate(`(() => ({name:${JSON.stringify(name)},url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,brokenImages:[...document.images].filter((image)=>!image.complete||image.naturalWidth===0).length,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches}))()`);
  const png = await command("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await fs.writeFile(path.join(destination, `${name}-390.png`), Buffer.from(png.data, "base64"));
  report.push(metrics);
}
await fs.writeFile(path.join(destination, "metrics.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
socket.close();
