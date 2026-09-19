const {createRequire}=require('node:module');
const path=require('node:path');
const {chromium}=createRequire(path.join(process.argv[2],'package.json'))('playwright');
const origin=process.argv[3]||'http://localhost:3000';
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
    await page.goto(origin+'/s/demo-food');
    const consent=page.getByRole('button',{name:'Только необходимые',exact:true});if(await consent.isVisible())await consent.click();
    await page.getByRole('heading',{name:'Как хотите заказать?'}).waitFor();
    await page.screenshot({path:'output/food-fulfilment-mobile-390.png',fullPage:true});
    await page.getByRole('button',{name:/Доставка/}).click();
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Food storefront overflows at 390px');
    const product=page.locator('main a[href*="/product/"]').first();await product.click();
    await page.getByRole('button',{name:'Купить сейчас',exact:true}).click();
    await page.getByRole('heading',{name:'Ваши контакты'}).waitFor();
    await page.getByLabel('Ваше имя').fill('Мобильный тест');
    await page.locator('input[type="tel"]').fill('+7 777 000 00 00');
    await page.getByRole('button',{name:'Продолжить'}).click();
    await page.getByRole('heading',{name:'Способ получения'}).waitFor();
    await page.getByText('Когда приготовить заказ?').waitFor();
    await page.screenshot({path:'output/food-checkout-time-mobile-390.png',fullPage:true});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Food checkout overflows at 390px');
    console.log('PASS food choice and scheduled checkout 390');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
