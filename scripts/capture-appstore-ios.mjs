import fs from "node:fs/promises";
import path from "node:path";

const destination = process.argv[2] ?? ".tmp/appstore-ios-46";
const baseUrl = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:8091";
const targets = await fetch("http://127.0.0.1:9340/json/list").then(response => response.json());
const target = targets.find(item => item.type === "page");
if (!target?.webSocketDebuggerUrl) throw new Error("No local browser target");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let id = 0;
const pending = new Map();
socket.addEventListener("message", event => { const message = JSON.parse(String(event.data)); const item = pending.get(message.id); if (!item) return; pending.delete(message.id); if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result); });
const command = (method, params = {}) => new Promise((resolve, reject) => { const commandId = ++id; pending.set(commandId, { resolve, reject }); socket.send(JSON.stringify({ id: commandId, method, params })); });
const evaluate = async expression => (await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

await fs.mkdir(destination, { recursive: true });
await command("Page.enable");
await command("Runtime.enable");
await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

const screens = [
  { name: "01-dashboard", route: "/more?uiPreview=390", kind: "dashboard" },
  { name: "02-orders", route: "/orders?uiPreview=390", kind: "root" },
  { name: "03-catalog-menu", route: "/menu?uiPreview=390", kind: "root" },
  { name: "04-ai-studio", route: "/studio?uiPreview=390&studioStage=2", kind: "studio" },
  { name: "05-brand-preview", route: "/studio?uiPreview=390&studioStage=4", kind: "studio" },
];
const report = [];
const failures = [];
for (const viewportWidth of [430, 390]) {
  const viewportDirectory = path.join(destination, String(viewportWidth));
  await fs.mkdir(viewportDirectory, { recursive: true });
  await command("Emulation.setDeviceMetricsOverride", { width: viewportWidth, height: 932, deviceScaleFactor: 3, mobile: false, screenWidth: viewportWidth, screenHeight: 932 });
  for (const { name, route, kind } of screens) {
    await command("Page.navigate", { url: `${baseUrl}${route}` });
    await wait(3500);
    await evaluate("document.fonts?.ready?.then(()=>true)??true");
    await evaluate("Promise.all([...document.images].map(image=>image.decode?.().catch(()=>undefined))).then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))");
    await evaluate(`(()=>{let style=document.getElementById('capture-scrollbars');if(!style){style=document.createElement('style');style.id='capture-scrollbars';style.textContent='*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}';document.head.appendChild(style)}return true})()`);
    await evaluate(`(()=>{for(const element of document.querySelectorAll('*')){const style=getComputedStyle(element);if(/auto|scroll/.test(style.overflowY)&&element.scrollHeight>element.clientHeight+1)element.scrollTop=0}window.scrollTo(0,0);return true})()`);
    await wait(350);
    const metrics = await evaluate(`(()=>{const all=[...document.querySelectorAll('*')];const rect=element=>{if(!element)return null;const value=element.getBoundingClientRect();return {left:value.left,top:value.top,right:value.right,bottom:value.bottom,width:value.width,height:value.height}};const visual=element=>{if(!element)return false;const value=element.getBoundingClientRect();const style=getComputedStyle(element);const range=document.createRange();range.selectNodeContents(element);const textRect=[...range.getClientRects()].some(item=>item.width>1&&item.height>1&&item.right>0&&item.left<innerWidth&&item.bottom>0&&item.top<innerHeight);const x=Math.min(innerWidth-1,Math.max(0,value.left+value.width/2));const y=Math.min(innerHeight-1,Math.max(0,value.top+value.height/2));const hit=document.elementFromPoint(x,y);return style.display!=='none'&&style.visibility==='visible'&&Number(style.opacity)>0.05&&value.width>1&&value.height>1&&value.left>=-0.5&&value.right<=innerWidth+0.5&&value.top>=-0.5&&value.bottom<=innerHeight+0.5&&textRect&&Boolean(hit&&(hit===element||element.contains(hit)))};const findText=needle=>all.find(element=>element.children.length===0&&(element.textContent?.trim()??'')===needle);const tabElements=[...document.querySelectorAll('[role="tab"]')];let nav=tabElements[0]?.parentElement??null;while(nav&&tabElements.some(tab=>!nav.contains(tab)))nav=nav.parentElement;const tabs=tabElements.map(element=>({text:element.textContent?.trim()??'',rect:rect(element),visible:visual(element)}));const providerElement=all.find(element=>element.children.length===0&&(element.textContent?.includes('AI-чат пока не подключён')??false));const composerLabel=findText('AI-чат пока не подключён');let composer=composerLabel?.parentElement??null;while(composer&&composer.getBoundingClientRect().width<innerWidth*.8)composer=composer.parentElement;const header=findText('ГЛАВНАЯ');const scrollables=all.filter(element=>{const style=getComputedStyle(element);return /auto|scroll/.test(style.overflowY)&&element.scrollHeight>element.clientHeight+1});return {url:location.href,width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,bodyRect:rect(document.body),navRect:rect(nav),tabs,composerRect:rect(composer),ctaRect:null,lowStockRect:null,studioPageRect:rect(document.body),headerRect:rect(header),headerVisible:visual(header),rootScrollTop:scrollables.length?Math.max(...scrollables.map(element=>element.scrollTop)):0,studioScrollTop:scrollables.length?Math.max(...scrollables.map(element=>element.scrollTop)):0,providerCopy:providerElement?.textContent?.trim()??null,brokenImages:[...document.images].filter(image=>!image.complete||image.naturalWidth===0).length,bodyText:document.body.innerText.slice(0,320)}})()`);
    const checks = {
      noHorizontalOverflow: metrics.scrollWidth <= viewportWidth + 0.5 && metrics.bodyRect.left >= -0.5 && metrics.bodyRect.right <= viewportWidth + 0.5,
      imagesLoaded: metrics.brokenImages === 0,
      rootHasMeasuredNav: kind === "studio" ? metrics.tabs.length === 0 : Boolean(metrics.navRect && metrics.tabs.length === 4),
      navFourItems: !metrics.navRect || metrics.tabs.length === 4,
      navLabelsExact: !metrics.navRect || JSON.stringify(metrics.tabs.map(tab => tab.text)) === JSON.stringify(["Главная", "Заказы", "Каталог", "Ещё"]),
      navLabelsVisuallyVisible: !metrics.navRect || metrics.tabs.every(tab => tab.visible),
      navItemsInsideViewport: !metrics.navRect || metrics.tabs.every(tab => tab.rect.left >= -0.5 && tab.rect.right <= viewportWidth + 0.5 && tab.rect.width >= 60),
      navItemsDoNotOverlap: !metrics.navRect || metrics.tabs.every((tab, index) => index === 0 || tab.rect.left >= metrics.tabs[index - 1].rect.right - 0.5),
      captureStartsAtTop: kind === "studio" ? metrics.studioScrollTop === 0 : metrics.rootScrollTop === null || metrics.rootScrollTop === 0,
      dashboardHeaderVisible: kind !== "dashboard" || Boolean(metrics.headerVisible && metrics.headerRect?.top >= 0),
      studioFillsViewport: kind !== "studio" || Boolean(metrics.studioPageRect && metrics.studioPageRect.left >= -0.5 && metrics.studioPageRect.right <= viewportWidth + 0.5 && metrics.studioPageRect.width >= viewportWidth - 1),
      composerInsideViewport: kind !== "studio" || Boolean(metrics.composerRect && metrics.composerRect.left >= -0.5 && metrics.composerRect.right <= viewportWidth + 0.5),
      providerCopyHonest: kind !== "studio" || Boolean(metrics.providerCopy?.includes("AI-чат пока не подключён") && !metrics.providerCopy.includes("AI попросит подтверждение")),
    };
    const failedChecks = Object.entries(checks).filter(([, passed]) => !passed).map(([check]) => check);
    if (failedChecks.length) failures.push({ viewportWidth, name, failedChecks, metrics });
    const png = await command("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    await fs.writeFile(path.join(viewportDirectory, `${name}-${viewportWidth * 3}x2796.png`), Buffer.from(png.data, "base64"));
    report.push({ viewportWidth, name, checks, ...metrics });
  }
}
await fs.writeFile(path.join(destination, "metrics.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
socket.close();
if (failures.length) throw new Error(`Geometry acceptance failed: ${JSON.stringify(failures)}`);
