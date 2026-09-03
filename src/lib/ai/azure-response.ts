import { z } from "zod";

const completionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.unknown() }),
  })).min(1),
  usage: z.unknown().optional(),
});

const usageSchema = z.object({
  prompt_tokens: z.number().int().nonnegative().nullish(),
  completion_tokens: z.number().int().nonnegative().nullish(),
  total_tokens: z.number().int().nonnegative().nullish(),
}).passthrough();

export function parseAzureFoundryResponse(payload: unknown) {
  const parsed = completionSchema.parse(payload);
  const rawContent = parsed.choices[0]?.message.content;
  const content = typeof rawContent === "string"
    ? rawContent.trim()
    : Array.isArray(rawContent)
      ? rawContent
          .map((part) => {
            if (!part || typeof part !== "object") return "";
            const text = "text" in part ? part.text : null;
            return typeof text === "string" ? text : "";
          })
          .join("")
          .trim()
      : "";
  if (!content) throw new Error("Empty Azure AI content");

  const parsedUsage = usageSchema.safeParse(parsed.usage);
  const usage = parsedUsage.success
    ? {
        prompt_tokens: parsedUsage.data.prompt_tokens ?? undefined,
        completion_tokens: parsedUsage.data.completion_tokens ?? undefined,
        total_tokens: parsedUsage.data.total_tokens ?? undefined,
      }
    : undefined;

  return { content, usage };
}
