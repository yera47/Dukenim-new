"use client";

export async function readBrandbookPdf(file: File): Promise<{ text: string; pages: number; truncated: boolean }> {
  if (file.size > 10 * 1024 * 1024) throw new Error("PDF должен быть не больше 10 МБ.");
  const data = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(data.slice(0, 5)) !== "%PDF-") throw new Error("Файл не похож на PDF.");
  const pdf = await import("pdfjs-dist");
  const port = new Worker(new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url), { type: "module" });
  let task: ReturnType<typeof pdf.getDocument> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const worker = pdf.PDFWorker.create({ port });
    const loadingTask = pdf.getDocument({ data, worker, useWorkerFetch: false, stopAtErrors: true, useSystemFonts: false, disableFontFace: true });
    task = loadingTask;
    return await Promise.race([
      (async () => {
        const document = await loadingTask.promise;
        if (document.numPages > 40) throw new Error("В PDF больше 40 страниц. Загрузите сокращённый брендбук.");
        let text = "";
        let truncated = false;
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
          const page = await document.getPage(pageNumber);
          const content = await page.getTextContent();
          const line = content.items.map(item => "str" in item ? item.str : "").join(" ");
          const addition = `\nСтраница ${pageNumber}: ${line.trim()}\n`;
          if ((text + addition).length > 5800) { text += addition.slice(0, 5800 - text.length); truncated = true; page.cleanup(); break; }
          text += addition;
          page.cleanup();
        }
        if (text.replace(/Страница \d+:/g, "").trim().length < 20) throw new Error("В PDF нет читаемого текста: возможно, это скан. Вставьте правила вручную или продолжите без брендбука.");
        return { text: text.trim(), pages: document.numPages, truncated };
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { port.terminate(); reject(new Error("Чтение PDF заняло слишком много времени. Попробуйте меньший файл.")); }, 30000); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    void task?.destroy().catch(() => undefined);
    port.terminate();
  }
}
