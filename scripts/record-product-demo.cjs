const { createRequire } = require("node:module");
const path = require("node:path");
const runtimeRequire = createRequire(path.join(process.argv[2], "package.json"));
const { chromium } = runtimeRequire("playwright");
const origin = process.argv[3] || "http://localhost:3003";

(async () => {
  const browser = await chromium.launch({channel:"msedge",headless:true});
  try {
    await Promise.all([
      {name:"storefront",width:390,height:780,url:"/s/demo-shop"},
      {name:"workspace",width:1200,height:780,url:"/admin/orders"}
    ].map(async scene => {
      const context=await browser.newContext({viewport:{width:scene.width,height:scene.height},recordVideo:{dir:"output/recordings",size:{width:scene.width,height:scene.height}}});
      await context.addCookies([{name:"dukenim_cookie_consent",value:"essential",url:origin}]);
      const page=await context.newPage();
      await page.goto(origin+scene.url,{waitUntil:"networkidle"});
      // Fresh, local-only browser contexts contain no production account session.
      await page.waitForTimeout(1800);
      if(scene.name==="storefront"){
        await page.getByRole("link",{name:/Жакет Essential 42/}).click();
        await page.waitForTimeout(1600);
        await page.getByRole("button",{name:"Добавить в корзину"}).click();
        await page.waitForTimeout(900);
        await page.getByRole("link",{name:"Корзина"}).click();
        await page.waitForTimeout(1500);
        await page.getByRole("link",{name:"Оформить заказ"}).click();
        await page.waitForTimeout(1800);
        await page.evaluate(()=>window.scrollBy({top:240,behavior:"smooth"}));
        await page.waitForTimeout(1200);
      }else{
        await page.getByRole("link",{name:"Каталог",exact:true}).click();
        await page.waitForTimeout(1700);
        await page.getByRole("link",{name:"Аналитика",exact:true}).click();
        await page.waitForTimeout(1700);
        await page.getByRole("link",{name:"Заказы",exact:true}).click();
        await page.waitForTimeout(1700);
      }
      await page.screenshot({path:"output/"+scene.name+"-capture.png"});
      const video=page.video();
      await context.close();
      await video.saveAs("public/design/dukenim-"+scene.name+"-recording.webm");
      console.log(scene.name+" recorded");
    }));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
