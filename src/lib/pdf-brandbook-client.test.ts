import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readBrandbookPdf } from "./pdf-brandbook-client";

const mocks = vi.hoisted(() => ({ getDocument: vi.fn(), create: vi.fn(), terminate: vi.fn(), destroy: vi.fn() }));
vi.mock("pdfjs-dist", () => ({ getDocument: mocks.getDocument, PDFWorker: { create: mocks.create } }));
function file(body = "%PDF-1.7 sample") { return new File([body], "brand.pdf", { type: "application/pdf" }); }
function documentWith(text: string, pages = 1) {
  const cleanup = vi.fn();
  mocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: pages, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: text }] }), cleanup }) }), destroy: mocks.destroy });
  return cleanup;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.destroy.mockResolvedValue(undefined);
  vi.stubGlobal("Worker", class { terminate = mocks.terminate; });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("private client PDF text import", () => {
  it("releases the worker when PDF initialisation throws", async () => {
    mocks.create.mockImplementationOnce(() => { throw new Error("worker setup failed"); });
    await expect(readBrandbookPdf(file())).rejects.toThrow("worker setup failed");
    expect(mocks.terminate).toHaveBeenCalledOnce();
  });
  it("rejects an oversized file before creating a worker", async () => {
    await expect(readBrandbookPdf(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.pdf"))).rejects.toThrow("10 МБ");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects misleading PDF extensions", async () => {
    await expect(readBrandbookPdf(file("<html>not a PDF"))).rejects.toThrow("не похож");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("extracts text and always releases the worker", async () => {
    const cleanup = documentWith("Use a monochrome identity and a neutral grey accent.");
    expect(await readBrandbookPdf(file())).toMatchObject({ pages: 1, truncated: false });
    expect(cleanup).toHaveBeenCalledOnce();
    expect(mocks.destroy).toHaveBeenCalledOnce();
    expect(mocks.terminate).toHaveBeenCalledOnce();
  });
  it("keeps a long first page instead of calling it a scan", async () => {
    documentWith("Brand rule ".repeat(900));
    const result = await readBrandbookPdf(file());
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(5800);
    expect(result.text).toContain("Brand rule");
  });
  it("does not claim image-only scans were analysed", async () => {
    documentWith("");
    await expect(readBrandbookPdf(file())).rejects.toThrow("скан");
    expect(mocks.terminate).toHaveBeenCalledOnce();
  });
  it("bounds page count", async () => {
    documentWith("brand", 41);
    await expect(readBrandbookPdf(file())).rejects.toThrow("40 страниц");
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });
});
