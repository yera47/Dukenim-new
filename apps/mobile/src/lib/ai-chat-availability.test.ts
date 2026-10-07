import { describe, expect, it } from "vitest";
import { aiChatAvailabilityCopy } from "./ai-chat-availability";

describe("aiChatAvailabilityCopy", () => {
  it("does not promise chat actions or confirmation when the provider is off", () => {
    const copy = aiChatAvailabilityCopy(false);
    expect(copy.intro).toContain("AI-чат пока не подключён");
    expect(copy.intro).not.toContain("простыми словами");
    expect(copy.intro).not.toContain("AI попросит подтверждение");
  });

  it("uses the conversational promise only when the chat provider is explicitly on", () => {
    const copy = aiChatAvailabilityCopy(true);
    expect(copy.intro).toContain("простыми словами");
    expect(copy.intro).toContain("AI попросит подтверждение");
  });
});
