// Browser interaction test of real client component with a LOCAL mock action.
// Verifies UI/form handoff, not Supabase persistence or owner authentication.
const fs=require('node:fs/promises');const path=require('node:path');const http=require('node:http');
const{createRequire}=require('node:module');const{chromium}=createRequire(path.join(process.argv[2],'package.json'))('playwright');
const{build}=createRequire(createRequire(require.resolve('vitest/package.json')).resolve('vite/package.json'))('esbuild');
(async()=>{
 const actionMock=`export async function createProductAction(previous,form){window.__submitted=Array.from(form.entries()).map(([k,v])=>[k,typeof v==='string'?v:v.name]);window.__attempts=(window.__attempts||0)+1;return window.__attempts===1?{error:'Тестовая ошибка сохранения'}:{};}`;
 const built=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{ProductSetupForm}from'./src/components/admin/product-setup-form';createRoot(document.getElementById('app')).render(<ProductSetupForm vertical="beauty" categories={[{id:'demo-category',name:'Уход'}]}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',alias:{'@':path.resolve('src')},plugins:[{name:'local-action',setup(b){b.onResolve({filter:/^@\/app\/admin\/actions$/},()=>({path:'action',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:actionMock}));b.onResolve({filter:/^next\/image$/},()=>({path:'image',namespace:'image'}));b.onLoad({filter:/.*/,namespace:'image'},()=>({contents:`import React from 'react';export default function Image({unoptimized,...props}){return React.createElement('img',props);}`,resolveDir:process.cwd()}));}}]});
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?built.outputFiles[0].contents:'<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="app"></div><script src="/app.js"></script>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const visible=async()=>{if(await page.locator('section[data-product-step]:visible').count()!==1)throw Error('More than one active step');};
  await visible();await page.getByRole('button',{name:'Продолжить →'}).click();await page.getByRole('alert').getByText(/Введите название/).waitFor();
  await page.getByLabel('Название',{exact:true}).fill('Серик крем');await page.getByLabel('Раздел',{exact:true}).selectOption('demo-category');
  await page.getByRole('button',{name:'Продолжить →'}).click();await visible();await page.getByRole('heading',{name:'Покажите товар покупателю'}).waitFor();
  await page.locator('input[type=file]').setInputFiles({name:'product.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWQAAAABJRU5ErkJggg==','base64')});
  await page.getByRole('button',{name:'Продолжить →'}).click();await visible();await page.getByLabel('Цена, ₸',{exact:true}).fill('21700');await page.getByLabel('Количество',{exact:true}).first().fill('5');
  await page.getByRole('button',{name:'Продолжить →'}).click();await visible();await page.getByRole('button',{name:'Назад',exact:true}).click();
  if(await page.getByLabel('Цена, ₸',{exact:true}).inputValue()!=='21700')throw Error('Lost price');
  await page.getByRole('button',{name:'Продолжить →'}).click();
  if(await page.evaluate(()=>Boolean(window.__submitted)))throw Error('Premature save before final button');
  await page.getByRole('button',{name:'Сохранить товар',exact:true}).click();await page.waitForFunction(()=>window.__submitted);
  const pairs=await page.evaluate(()=>window.__submitted);const get=name=>pairs.find(([key])=>key===name)?.[1];
  if(get('title')!=='Серик крем'||get('price')!=='21700'||get('stock')!=='5'||get('categoryId')!=='demo-category'||get('images')!=='product.png'||get('fromStudio')!=='true')throw Error('Incorrect LOCAL fixture fields: '+JSON.stringify(pairs));
  await page.getByRole('alert').getByText('Тестовая ошибка сохранения').waitFor();
  await page.getByRole('button',{name:'Сохранить товар',exact:true}).click();await page.waitForFunction(()=>window.__attempts===2);
  if(JSON.stringify(await page.evaluate(()=>window.__submitted))!==JSON.stringify(pairs))throw Error('Lost fields/photo after action error');
  console.log('PASS one-step product UI, validation, back navigation and final FormData (LOCAL mock, no database write)');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
