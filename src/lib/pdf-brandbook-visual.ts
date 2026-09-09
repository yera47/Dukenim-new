"use client";

export async function renderBrandbookPage(file:File,pageNumber:number):Promise<{image:string;pages:number}> {
  if(file.size>10*1024*1024)throw new Error("PDF должен быть не больше 10 МБ.");
  if(!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>40)throw new Error("Выберите страницу от 1 до 40.");
  const data=new Uint8Array(await file.arrayBuffer());
  if(new TextDecoder().decode(data.slice(0,5))!=="%PDF-")throw new Error("Файл не похож на PDF.");
  const pdf=await import("pdfjs-dist");
  const port=new Worker(new URL("pdfjs-dist/build/pdf.worker.mjs",import.meta.url),{type:"module"});
  let task:ReturnType<typeof pdf.getDocument>|undefined;
  let timer:ReturnType<typeof setTimeout>|undefined;
  let canvas:HTMLCanvasElement|undefined;
  try {
    const worker=pdf.PDFWorker.create({port});
    task=pdf.getDocument({data,worker,useWorkerFetch:false,stopAtErrors:true,useSystemFonts:false,disableFontFace:true});
    const loading=task;
    return await Promise.race([(async()=>{
      const document=await loading.promise;
      if(document.numPages>40||pageNumber>document.numPages)throw new Error(`В документе ${document.numPages} стр. Допустимо не больше 40.`);
      const page=await document.getPage(pageNumber);
      const base=page.getViewport({scale:1});
      const scale=Math.min(1100/base.width,1100/base.height);
      if(!Number.isFinite(scale)||scale<=0)throw new Error("Некорректный размер страницы.");
      const viewport=page.getViewport({scale});
      canvas=globalThis.document.createElement("canvas");
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      const context=canvas.getContext("2d");
      if(!context)throw new Error("Браузер не поддерживает просмотр PDF.");
      await page.render({canvas,canvasContext:context,viewport,background:"rgb(255,255,255)"}).promise;
      const image=canvas.toDataURL("image/jpeg",0.82);
      if(!image.startsWith("data:image/jpeg;base64,")||image.length>900000)throw new Error("Страница слишком сложная. Попробуйте PDF меньшего размера.");
      page.cleanup();return {image,pages:document.numPages};
    })(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{port.terminate();reject(new Error("Просмотр PDF занял слишком много времени."));},30000);})]);
  }finally{if(timer)clearTimeout(timer);void task?.destroy().catch(()=>undefined);port.terminate();if(canvas){canvas.width=0;canvas.height=0;}}
}
