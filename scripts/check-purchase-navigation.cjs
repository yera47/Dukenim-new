const {createRequire}=require('node:module');
const path=require('node:path');
const {chromium}=createRequire(path.join(process.argv[2],'package.json'))('playwright');
const origin=process.argv[3]||'http://localhost:3001';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto(origin+'/demo');
  await page.locator('a[href="/demo/food"]').click();
  await page.getByRole('heading',{name:'Как покупатели будут выбирать?'}).waitFor();
  if(await page.locator('main article').count()!==3)throw Error('Missing three choices');
  await page.goto(origin+'/s/demo-food/product/food-2');
  const cookies=page.getByRole('button',{name:'Только необходимые',exact:true});if(await cookies.isVisible())await cookies.click();
  await page.getByRole('button',{name:'В корзину',exact:true}).click();
  await page.getByRole('dialog').waitFor();
  await page.screenshot({path:`output/cart-added-${width}.png`});
  await page.getByRole('link',{name:'Продолжить покупки',exact:true}).click();
  await page.waitForURL('**/s/demo-food/catalog');
  await page.locator('a[href="/s/demo-food/product/food-2"]').first().click();
  await page.getByRole('button',{name:'Купить сейчас',exact:true}).click();
  await page.waitForURL('**/s/demo-food/checkout');
  await page.getByRole('heading',{name:'Ваши контакты',exact:true}).waitFor();
  await page.locator('a[href="/s/demo-food/cart"]').first().click();
  await page.waitForURL('**/s/demo-food/cart');
  if((await page.locator('body').innerText()).includes('Корзина пуста'))throw Error('Lost cart');
  if(!(await page.locator('body').innerText()).includes('Сэндвич с сыром'))throw Error('Missing selected item');
  if(!(await page.locator('body').innerText()).includes('× 2'))throw Error('Unexpected cart quantity after two additions');
  console.log(`PASS segment, add dialog, continue shopping, buy now ${width}`);
  await page.close();
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
