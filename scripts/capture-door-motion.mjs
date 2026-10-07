import fs from "node:fs/promises";
import path from "node:path";

const destination = process.argv[2] ?? ".tmp/door-motion-next";
const targets = await fetch("http://127.0.0.1:9340/json/list").then(response => response.json());
const target = targets.find(item => item.type === "page" && item.url.startsWith("http://127.0.0.1:8091"));
if (!target?.webSocketDebuggerUrl) throw new Error("No local Expo browser target");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let id = 0;
const pending = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(String(event.data));
  const item = pending.get(message.id);
  if (!item) return;
  pending.delete(message.id);
  if (message.error) item.reject(new Error(message.error.message));
  else item.resolve(message.result);
});
const command = (method, params = {}) => new Promise((resolve, reject) => {
  const commandId = ++id;
  pending.set(commandId, { resolve, reject });
  socket.send(JSON.stringify({ id: commandId, method, params }));
});
const evaluate = async expression => (await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

await fs.mkdir(destination, { recursive: true });
await command("Page.enable");
await command("Runtime.enable");
await command("Emulation.setDeviceMetricsOverride", { width: 430, height: 932, deviceScaleFactor: 3, mobile: false, screenWidth: 430, screenHeight: 932 });
await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
await command("Page.navigate", { url: "http://127.0.0.1:8091/more?uiPreview=390&doorPreview=static" });
await wait(3000);
await evaluate("document.fonts?.ready?.then(()=>true)??true");
await evaluate(`(()=>{let style=document.getElementById('capture-scrollbars');if(!style){style=document.createElement('style');style.id='capture-scrollbars';style.textContent='*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}';document.head.appendChild(style)}return true})()`);
const metrics = await evaluate(`(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,bodyWidth:document.body.getBoundingClientRect().width,brokenImages:[...document.images].filter(image=>!image.complete||image.naturalWidth===0).length}))()`);
const png = await command("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
const screenshot = path.join(destination, "dukenim-door-entry-real-1290x2796.png");
await fs.writeFile(screenshot, Buffer.from(png.data, "base64"));
await fs.writeFile(path.join(destination, "metrics.json"), JSON.stringify(metrics, null, 2));
console.log(JSON.stringify({ screenshot, ...metrics }, null, 2));
socket.close();
