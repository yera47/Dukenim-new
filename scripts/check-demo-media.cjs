const { createRequire } = require('node:module');
const path = require('node:path');
const { chromium } = createRequire(path.join(process.argv[2], 'package.json'))('playwright');
const origin = process.argv[3] || 'http://localhost:3005';
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  for (const width of [390,1440]) {
   const page = await browser.newPage({viewport:{width,height:1000}});
   for (const niche of ['beauty','food','flowers','home','services','event','other']) {
    const response = await page.goto(origin+'/s/demo-'+niche+'/catalog');
    if (response.status() !== 200) throw Error(niche+' status '+response.status());
    const cards = page.locator('.product-image');
    if (await cards.count()<4) throw Error(niche+' too few cards');
    const images = await cards.evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).backgroundImage));
    if (images.some(image=>image==='none')) throw Error(niche+' missing image');
    await page.evaluate(async () => {await Promise.all([...document.querySelectorAll('.product-image')].map(node=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error('Image failed'));image.src=getComputedStyle(node).backgroundImage.slice(5,-2);})));});
    if (await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)) throw Error(niche+' overflow');
    await page.screenshot({path:'output/demo-'+niche+'-'+width+'.png',fullPage:true});
    console.log('PASS',niche,width,images.length,'images');
   }
   await page.close();
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
