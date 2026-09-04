import "server-only";
import { z } from "zod";

const responseSchema = z.object({ images: z.array(z.object({ url: z.string().url() })).min(1) });

export class FalImageError extends Error {
  constructor(message: string, public readonly status?: number) { super(message); }
}

export function getFalImageStatus() {
  return { configured: Boolean(process.env.FAL_KEY), model: process.env.FAL_IMAGE_MODEL ?? "fal-ai/flux-pro/v1.1" };
}

export async function createFalImage(prompt: string) {
  const status = getFalImageStatus();
  if (!status.configured) throw new FalImageError("Генерация баннеров ещё не подключена на сервере.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`https://fal.run/${status.model}`, {
      method: "POST",
      headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image_size: "square_hd", num_images: 1, output_format: "png" }),
      signal: controller.signal,
    });
    if (!response.ok) throw new FalImageError("Сервис изображений временно недоступен. Попробуйте ещё раз.", response.status);
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new FalImageError("Сервис изображений вернул неполный результат.");
    return { imageUrl: parsed.data.images[0].url };
  } catch (error) {
    if (error instanceof FalImageError) throw error;
    throw new FalImageError("Не удалось дождаться изображения. Попробуйте ещё раз.");
  } finally { clearTimeout(timeout); }
}
