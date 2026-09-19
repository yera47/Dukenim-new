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
    await page.getByRole('navigation',{name:'Разделы меню'}).waitFor();
    await page.getByRole('button',{name:/Добавить .* в корзину/}).first().waitFor();
    await page.screenshot({path:'output/food-menu-mobile-390.png',fullPage:true});
    await page.getByRole('button',{name:/^Добавить/}).first().click();
    await page.waitForFunction(()=>{const value=localStorage.getItem('dukenim:cart:store:demo-food');return Boolean(value&&value!=="[]")});
    await page.goto(origin+'/s/demo-food/cart');
    await page.waitForTimeout(3000);
    await page.getByRole('link',{name:/Оформить заказ/}).click();
    await page.getByRole('heading',{name:'Ваш профиль'}).waitFor();
    await page.getByLabel('Ваше имя').fill('Мобильный тест');
    await page.locator('input[type="tel"]').fill('+7 777 000 00 00');
    await page.getByRole('button',{name:'Продолжить'}).click();
    await page.getByRole('heading',{name:'Способ получения'}).waitFor();
    await page.getByText('Когда приготовить заказ?').waitFor();
    await page.screenshot({path:'output/food-checkout-time-mobile-390.png',fullPage:true});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Food checkout overflows at 390px');
    for(const approach of ['assortment','guided']){
      await page.goto(`${origin}/demo/food/${approach}`);
      await page.getByRole('heading',{name:'Как хотите заказать?'}).waitFor();
      await page.getByRole('button',{name:/Самовывоз/}).click();
      if(approach==='assortment')await page.getByRole('navigation',{name:'Разделы меню'}).waitFor();
      else await page.getByRole('region',{name:'Выбор раздела'}).waitFor();
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error(`Food ${approach} overflows at 390px`);
      await page.screenshot({path:`output/food-${approach}-mobile-390.png`,fullPage:true});
    }
    console.log('PASS food gate, quick menu, category menu and scheduled checkout 390');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
