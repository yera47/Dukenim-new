const {createRequire}=require('node:module');
const path=require('node:path');
const {chromium}=createRequire(path.join(process.argv[2],'package.json'))('playwright');
const origin=process.argv[3]||'http://localhost:3001';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900}});
   for(const vertical of ['fashion','beauty','food','flowers','home','other'])for(const approach of ['collection','assortment','guided']){
    const response=await page.goto(`${origin}/demo/${vertical}/${approach}`);
    if(response.status()!==200)throw Error('HTTP '+response.status());
    await page.locator(`main[data-approach="${approach}"]`).waitFor();
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error(`Overflow ${vertical}/${approach}/${width}`);
    await page.getByRole('heading',{name:'Каталог',exact:true}).waitFor();
    if(await page.locator('main a[href*="/product/"]').count()<3)throw Error('Missing populated product grid');
    if(vertical==='beauty')await page.screenshot({path:`output/commerce-beauty-${approach}-${width}.png`,fullPage:true});
    console.log(`PASS ${vertical}/${approach} ${width}`);
   }
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
