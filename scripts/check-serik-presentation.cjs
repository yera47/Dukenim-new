const {createRequire}=require('node:module');
const path=require('node:path');
const {chromium}=createRequire(path.join(process.argv[2],'package.json'))('playwright');
const origin=process.argv[3]||'http://localhost:3006';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const width of [390,1440]){const page=await browser.newPage({viewport:{width,height:1000}});await page.goto(origin);await page.locator('#pricing').scrollIntoViewIfNeeded();await page.locator('#pricing').screenshot({path:`output/serik-pricing-${width}.png`});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('overflow');await page.goto(origin+'/register');if(await page.getByPlaceholder('Серик',{exact:true}).count()!==1)throw Error('person placeholder');if(await page.getByPlaceholder('Серик Шоп',{exact:true}).count()!==1)throw Error('shop placeholder');await page.goto(origin+'/s/demo-shop');if(!(await page.locator('body').innerText()).includes('Серик Шоп'))throw Error('demo name');console.log('PASS presentation',width);await page.close();}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
