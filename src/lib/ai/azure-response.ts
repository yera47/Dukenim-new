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

export function describeAzureFoundryResponse(payload: unknown) {
  const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : null;
  const choices = root && Array.isArray(root.choices) ? root.choices : null;
  const firstChoice = choices?.[0] && typeof choices[0] === "object" ? choices[0] as Record<string, unknown> : null;
  const message = firstChoice?.message && typeof firstChoice.message === "object" ? firstChoice.message as Record<string, unknown> : null;
  const content = message?.content;
  const firstPart = Array.isArray(content) && content[0] && typeof content[0] === "object" ? content[0] as Record<string, unknown> : null;
  const usage = root?.usage && typeof root.usage === "object" ? root.usage as Record<string, unknown> : null;

  return {
    rootType: Array.isArray(payload) ? "array" : typeof payload,
    rootKeys: root ? Object.keys(root).sort() : [],
    choicesLength: choices?.length ?? null,
    firstChoiceKeys: firstChoice ? Object.keys(firstChoice).sort() : [],
    messageKeys: message ? Object.keys(message).sort() : [],
    contentType: Array.isArray(content) ? "array" : typeof content,
    contentParts: Array.isArray(content) ? content.length : null,
    firstPartKeys: firstPart ? Object.keys(firstPart).sort() : [],
    usageKeys: usage ? Object.keys(usage).sort() : [],
  };
}
