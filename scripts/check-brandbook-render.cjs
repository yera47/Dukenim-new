// Read-only real PDF/browser rendering smoke. Never sends a document to Azure.
const fs=require('node:fs/promises');const path=require('node:path');const http=require('node:http');
const ts=require('typescript');const {createRequire}=require('node:module');
const {chromium}=createRequire(path.join(process.argv[2],'package.json'))('playwright');
(async()=>{
 const source=await fs.readFile('src/lib/pdf-brandbook-visual.ts','utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace('import("pdfjs-dist")','import("/pdf.mjs")');
 const fixture=await fs.readFile('output/pdf/Dukenim_Brandbook_2026.pdf');
 const routes={
  '/':{type:'text/html',data:'<!doctype html><title>Local brandbook rendering check</title>'},
  '/renderer.mjs':{type:'text/javascript',data:js},
  '/fixture.pdf':{type:'application/pdf',data:fixture},
  '/pdf.mjs':{type:'text/javascript',data:await fs.readFile('node_modules/pdfjs-dist/build/pdf.mjs')},
  '/pdfjs-dist/build/pdf.worker.mjs':{type:'text/javascript',data:await fs.readFile('node_modules/pdfjs-dist/build/pdf.worker.mjs')}
 };
 const server=http.createServer((req,res)=>{const route=routes[req.url];res.writeHead(route?200:404,{'Content-Type':route?.type??'text/plain','Cache-Control':'no-store'});res.end(route?.data??'Not found');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result=await page.evaluate(async()=>{const {renderBrandbookPage}=await import('/renderer.mjs');const bytes=await(await fetch('/fixture.pdf')).arrayBuffer();return renderBrandbookPage(new File([bytes],'brand.pdf',{type:'application/pdf'}),1);});
  if(!result.image.startsWith('data:image/jpeg;base64,')||result.pages<1)throw Error('Invalid render');
  await fs.mkdir('output/brandbook-review',{recursive:true});await fs.writeFile('output/brandbook-review/page-1.jpg',Buffer.from(result.image.split(',')[1],'base64'));
  console.log(`PASS real PDF page1/${result.pages}; image payload ${result.image.length} chars; no external upload`);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
