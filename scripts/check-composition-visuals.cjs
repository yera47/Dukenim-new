const {createRequire}=require('node:module');
const path=require('node:path');
const fs=require('node:fs/promises');
const req=createRequire(path.join(process.argv[2],'package.json'));
const {chromium}=req('playwright');
const sharp=req('sharp');
const origin=process.argv[3]||'http://localhost:3011';
(async()=>{
 const destination='output/composition-review';await fs.mkdir(destination,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [390,1440]){
   const images=[];const page=await browser.newPage({viewport:{width,height:1000}});
   for(const vertical of ['fashion','beauty','food','flowers','home','other'])for(const approach of ['collection','assortment','guided']){
    const id=`${vertical}-${approach}`;
    await page.goto(`${origin}/demo/${vertical}/${approach}`);
    const consent=page.getByRole('button',{name:'Только необходимые'});if(await consent.isVisible())await consent.click();
    await page.locator(`main[data-approach="${approach}"]`).waitFor();
    await page.locator('main img').evaluateAll(async images=>Promise.race([Promise.all(images.filter(image=>image.loading!=='lazy').map(image=>image.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,10000))]));
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Overflow '+id+' '+width);
    const failures=await page.locator('main img').evaluateAll(images=>images.filter(image=>image.complete&&image.naturalWidth===0).map(image=>image.src));
    if(failures.length)throw Error('Broken images '+id);
    const file=`${destination}/${id}-${width}.png`;await page.screenshot({path:file});
    images.push(await sharp(file).resize(360,250,{fit:'cover',position:'top'}).png().toBuffer());
    const product=page.locator('main a[href*="/product/"]').first();await product.click();
    await page.locator('[data-product-detail]').waitFor();
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Product overflow '+id);
    console.log('PASS visual '+id+' '+width);
   }
   await sharp({create:{width:1080,height:1500,channels:3,background:'#ddd'}}).composite(images.map((input,index)=>({input,left:(index%3)*360,top:Math.floor(index/3)*250}))).png().toFile(`${destination}/overview-${width}.png`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
