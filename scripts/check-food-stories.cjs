const {createRequire}=require('node:module');
const path=require('node:path');
const {chromium}=createRequire(path.join(process.argv[2],'package.json'))('playwright');
const origin=process.argv[3]||'http://localhost:3000';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:844}});
  await page.goto(origin+'/demo/food/assortment');
  await page.getByRole('button',{name:'Только необходимые',exact:true}).click();
  await page.getByRole('button',{name:/Самовывоз/}).click();
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Horizontal overflow '+width);
  await page.screenshot({path:`output/frito-template-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:/Открыть историю:/}).first().click();
  await page.getByRole('dialog',{name:'История меню'}).waitFor();
  await page.getByRole('button',{name:'Приостановить историю'}).click();
  await page.screenshot({path:`output/frito-template-story-${width}.png`});
  await page.getByRole('button',{name:'Следующая история'}).click();
  await page.getByRole('dialog').getByRole('heading',{name:'Сэндвич с сыром'}).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog',{name:'История меню'}).waitFor({state:'hidden'});
  await page.getByRole('searchbox',{name:'Найти блюдо'}).fill('Кофе');
  if(await page.locator('.food-menu-card').count()!==1)throw Error('Search failed');
  await page.getByRole('searchbox',{name:'Найти блюдо'}).fill('');
  await page.getByRole('button',{name:/Добавить .* в корзину/}).first().click();
  await page.getByRole('link',{name:/Корзина · 1/}).click();
  await page.getByText('Круассан-сэндвич',{exact:true}).first().waitFor();
  console.log('PASS stories/pause/next/escape/search/cart, no overflow',width);
  await page.close();
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

