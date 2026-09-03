import { describe, expect, it } from "vitest";
import { parseAzureFoundryResponse } from "./azure-response";

describe("parseAzureFoundryResponse", () => {
  it("accepts the standard chat completion shape", () => {
    expect(parseAzureFoundryResponse({
      choices: [{ message: { content: "Готовый ответ" } }],
      usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
    })).toEqual({
      content: "Готовый ответ",
      usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
    });
  });

  it("accepts provider content parts and nullable usage counters", () => {
    expect(parseAzureFoundryResponse({
      choices: [{ message: { content: [{ type: "text", text: "Ответ " }, { type: "output_text", text: "Kimi" }] } }],
      usage: { prompt_tokens: null, completion_tokens: null, total_tokens: null },
    })).toEqual({
      content: "Ответ Kimi",
      usage: { prompt_tokens: undefined, completion_tokens: undefined, total_tokens: undefined },
    });
  });
});
