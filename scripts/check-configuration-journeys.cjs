const {createRequire}=require('node:module');
const path=require('node:path');
const {chromium}=createRequire(path.join(process.argv[2],'package.json'))('playwright');
const origin=process.argv[3]||'http://localhost:3001';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900}});
   for(const vertical of ['fashion','beauty','food','flowers','home','other'])for(const approach of ['collection','assortment','guided']){
    const base=`/demo/${vertical}/${approach}`;
    await page.goto(origin+base);
    const consent=page.getByRole('button',{name:'Только необходимые'});if(await consent.isVisible())await consent.click();
    const productLink=page.locator('main a[href*="/product/"]').first();
    const href=await productLink.getAttribute('href');if(!href.startsWith(base+'/'))throw Error('Lost configuration '+href);
    await productLink.click();await page.getByRole('button',{name:'В корзину',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('link',{name:'Продолжить покупки',exact:true}).click();
    await page.waitForURL(origin+base+'/catalog');
    if(!page.url().endsWith(base+'/catalog'))throw Error('Wrong catalog');
    await page.locator(`main a[href="${href}"]`).click();
    await page.getByRole('button',{name:'Купить сейчас',exact:true}).click();
    await page.getByRole('heading',{name:'Проверка заказа',exact:true}).waitFor();
    if(!page.url().endsWith(base+'/checkout'))throw Error('Wrong checkout');
    await page.getByText('× 2',{exact:false}).waitFor();
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Overflow');
    console.log(`PASS journey ${vertical}/${approach} ${width}`);
   }
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
