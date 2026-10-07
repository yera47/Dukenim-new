import fs from "node:fs/promises";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3013";
const destination = process.argv[3] ?? ".tmp/concept-renders";
const concepts = process.argv[4]?.split(",").filter(Boolean) ?? ["fashion", "beauty", "flowers", "home", "other"];
const requestedScrollY = Number(process.argv[5] ?? 0);
const targets = await fetch("http://127.0.0.1:9340/json/list").then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target?.webSocketDebuggerUrl) throw new Error("No local browser target");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let id = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  const item = pending.get(message.id);
  if (!item) return;
  pending.delete(message.id);
  if (message.error) item.reject(new Error(message.error.message));
  else item.resolve(message.result);
});
const command = (method, params = {}) => new Promise((resolve, reject) => { const commandId = ++id; pending.set(commandId, { resolve, reject }); socket.send(JSON.stringify({ id: commandId, method, params })); });
const evaluate = async (expression) => (await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await fs.mkdir(destination, { recursive: true });
await command("Page.enable");
await command("Runtime.enable");
const report = [];

for (const vertical of concepts) {
  for (const [width, height] of [[390, 844], [1440, 1000]]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 700, screenWidth: width, screenHeight: height });
    await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await command("Page.navigate", { url: `${origin}/demo/${vertical}/collection` });
    await wait(2500);
    await evaluate("document.fonts.ready.then(() => true)");
    await wait(750);
    await evaluate("document.querySelector('nextjs-portal')?.remove(); true");
    if (requestedScrollY > 0) {
      await evaluate(`scrollTo(0, ${JSON.stringify(requestedScrollY)}); true`);
      await wait(250);
    }
    const metrics = await evaluate(`(() => ({ vertical: ${JSON.stringify(vertical)}, width: innerWidth, viewportHeight: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, brokenImages: [...document.images].filter((image) => image.getBoundingClientRect().top < innerHeight * 1.2 && (!image.complete || image.naturalWidth === 0)).length, title: document.querySelector('h1')?.textContent, cta: [...document.querySelectorAll('a')].find((link) => link.href.includes('/catalog'))?.textContent?.trim(), reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }))()`);
    const shot = await command("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    const file = path.join(destination, `${vertical}-${width}${requestedScrollY > 0 ? `-y${requestedScrollY}` : ""}.png`);
    await fs.writeFile(file, Buffer.from(shot.data, "base64"));
    report.push({ ...metrics, file });
  }
}
await fs.writeFile(path.join(destination, "metrics.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
socket.close();
