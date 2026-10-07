import fs from "node:fs/promises";
import path from "node:path";

const port = Number(process.argv[2] ?? 9340);
const destination = process.argv[3] ?? "output/ux-audit";
const nextOrigin = process.argv[4] ?? "http://127.0.0.1:3011";
const mobileOrigin = process.argv[5] ?? "http://127.0.0.1:8091";
const captureFilter = new Set((process.argv[6] ?? "").split(",").filter(Boolean));

const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
const target = targets.find(item => item.type === "page" && item.url === "about:blank")
  ?? targets.find(item => item.type === "page" && item.url.startsWith("http://127.0.0.1"));
if (!target?.webSocketDebuggerUrl) throw new Error("A safe blank/local Edge target is unavailable");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let nextId = 0;
const pending = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(String(event.data));
  const callback = pending.get(message.id);
  if (!callback) return;
  pending.delete(message.id);
  if (message.error) callback.reject(new Error(message.error.message));
  else callback.resolve(message.result);
});
const command = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = async expression => (await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

await fs.mkdir(destination, { recursive: true });
await command("Page.enable");
await command("Runtime.enable");

const captures = [
  { name: "merchant-home", url: `${mobileOrigin}/more?uiPreview=390`, width: 390, height: 844 },
  { name: "merchant-door", url: `${mobileOrigin}/more?uiPreview=390&doorPreview=static`, width: 390, height: 844 },
  { name: "merchant-door-motion", url: `${mobileOrigin}/more?uiPreview=390&doorPreview=motion`, width: 390, height: 844, initialWait: 600, frameTimes: [0, 250, 430, 630, 1030] },
  { name: "merchant-orders", url: `${mobileOrigin}/orders?uiPreview=390`, width: 390, height: 844 },
  { name: "merchant-bulka-orders", url: `${mobileOrigin}/orders?uiPreview=390&brand=bulka`, width: 390, height: 844 },
  { name: "merchant-bulka-order", url: `${mobileOrigin}/order?uiPreview=390&brand=bulka&orderId=preview-1247&tenantId=preview-red-chocoberry`, width: 390, height: 844 },
  { name: "merchant-menu", url: `${mobileOrigin}/menu?uiPreview=390`, width: 390, height: 844 },
  { name: "merchant-bulka-menu", url: `${mobileOrigin}/menu?uiPreview=390&brand=bulka`, width: 390, height: 844 },
  { name: "merchant-studio", url: `${mobileOrigin}/studio?uiPreview=390&studioStage=4`, width: 390, height: 844 },
  { name: "merchant-integrations", url: `${mobileOrigin}/integrations?uiPreview=390`, width: 390, height: 844 },
  { name: "merchant-stories-collection", url: `${mobileOrigin}/stories?uiPreview=390&template=gallery`, width: 390, height: 844, interaction: "story-preview" },
  { name: "merchant-stories-assortment", url: `${mobileOrigin}/stories?uiPreview=390&brand=bulka&template=market`, width: 390, height: 844, interaction: "story-preview" },
  { name: "merchant-stories-guided", url: `${mobileOrigin}/stories?uiPreview=390&template=studio`, width: 390, height: 844, interaction: "story-preview" },
  { name: "buyer-home", url: `${nextOrigin}/demo/flowers/collection`, width: 390, height: 844, dismissCookies: true },
  { name: "buyer-product", url: `${nextOrigin}/demo/flowers/collection/product/flowers-2`, width: 390, height: 844, dismissCookies: true },
  { name: "buyer-cart", url: `${nextOrigin}/demo/flowers/collection/cart?fixture=reference`, width: 390, height: 844, dismissCookies: true },
  { name: "buyer-checkout", url: `${nextOrigin}/demo/flowers/collection/checkout?fixture=reference`, width: 390, height: 844, dismissCookies: true },
  { name: "buyer-checkout-focus", url: `${nextOrigin}/demo/flowers/collection/checkout?fixture=reference`, width: 390, height: 844, dismissCookies: true, interaction: "checkout" },
  { name: "buyer-home-desktop", url: `${nextOrigin}/demo/flowers/collection`, width: 1440, height: 900, dismissCookies: true },
  { name: "buyer-home-desktop-catalog", url: `${nextOrigin}/demo/flowers/collection`, width: 1440, height: 900, dismissCookies: true, scrollY: 620 },
  { name: "buyer-home-desktop-bottom", url: `${nextOrigin}/demo/flowers/collection`, width: 1440, height: 900, dismissCookies: true, scrollY: 999999 },
  { name: "bulka-home", url: `${nextOrigin}/demo/food/collection`, width: 390, height: 844, dismissCookies: true },
  { name: "bulka-product", url: `${nextOrigin}/demo/food/collection/product/food-1`, width: 390, height: 844, dismissCookies: true },
  { name: "bulka-cart", url: `${nextOrigin}/demo/food/collection/cart?fixture=reference`, width: 390, height: 844, dismissCookies: true },
  { name: "bulka-checkout", url: `${nextOrigin}/demo/food/collection/checkout?fixture=reference`, width: 390, height: 844, dismissCookies: true },
  { name: "bulka-home-desktop", url: `${nextOrigin}/demo/food/collection`, width: 1440, height: 900, dismissCookies: true },
  { name: "bulka-home-desktop-catalog", url: `${nextOrigin}/demo/food/collection`, width: 1440, height: 900, dismissCookies: true, scrollY: 620 },
  { name: "bulka-home-desktop-bottom", url: `${nextOrigin}/demo/food/collection`, width: 1440, height: 900, dismissCookies: true, scrollY: 999999 },
];
const report = [];
for (const capture of captures.filter(capture => captureFilter.size === 0 || captureFilter.has(capture.name))) {
  await command("Emulation.setDeviceMetricsOverride", {
    width: capture.width, height: capture.height, deviceScaleFactor: 1,
    mobile: capture.width < 700, screenWidth: capture.width, screenHeight: capture.height,
  });
  await command("Page.navigate", { url: capture.url });
  await wait(capture.initialWait ?? (capture.url.includes(":8091") ? 6500 : 3500));
  if (capture.dismissCookies) {
    await evaluate("document.querySelector('[role=dialog] button:last-child')?.click(); true");
    await wait(350);
  }
  if (capture.scrollY) {
    await evaluate(`window.scrollTo({top:${capture.scrollY},behavior:"instant"}); true`);
    await wait(capture.width >= 1000 ? 2200 : 350);
  }
  if (capture.interaction === "checkout") {
    await evaluate(`(() => {
      const phone = document.querySelector('input[type="tel"]');
      phone?.focus();
      const cta = document.querySelector('button.btn-cta');
      cta?.scrollIntoView({block:'end'});
      if (document.scrollingElement) document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
      return true;
    })()`);
    await wait(350);
  }
  if (capture.interaction === "story-preview") {
    await evaluate(`(() => {
      const preview = document.querySelector('[aria-label^="Точное место истории"]');
      preview?.scrollIntoView({block:'center',behavior:'instant'});
      return true;
    })()`);
    await wait(350);
  }
  await evaluate("document.querySelector('nextjs-portal')?.remove(); true");
  if (capture.frameTimes) {
    let previousTime=0;
    for (let index=0;index<capture.frameTimes.length;index++) {
      const time=capture.frameTimes[index];
      await wait(time-previousTime);
      previousTime=time;
      const frame=await command("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});
      await fs.writeFile(path.join(destination,`${capture.name}-frame-${index}-${time}ms-${capture.width}.png`),Buffer.from(frame.data,"base64"));
    }
  }
  const metrics = await evaluate(`(() => {
    const cta = document.querySelector('button.btn-cta');
    const rect = cta?.getBoundingClientRect();
    const ctaStyle = cta ? getComputedStyle(cta) : null;
    const images = [...document.querySelectorAll('img')].map(img => { const r=img.getBoundingClientRect(); const s=getComputedStyle(img); return {alt:img.alt,width:r.width,height:r.height,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,objectFit:s.objectFit,display:s.display}; });
    return {url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight,title:document.title,scrollY,activeType:document.activeElement?.getAttribute('type')??null,ctaRect:rect?{top:rect.top,bottom:rect.bottom}:null,ctaColor:ctaStyle?.color??null,ctaBackground:ctaStyle?.backgroundColor??null,images};
  })()`);
  const screenshot = await command("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await fs.writeFile(path.join(destination, `${capture.name}-${capture.width}.png`), Buffer.from(screenshot.data, "base64"));
  report.push({ name: capture.name, ...metrics });
}
await fs.writeFile(path.join(destination, "metrics.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
socket.close();
