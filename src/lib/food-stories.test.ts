import { describe, expect, it, vi } from "vitest";
import { loadStoreStories } from "./food-stories";

describe("store story loading", () => {
  it("scopes to one tenant and removes expired published stories after reload", async () => {
    const now = Date.parse("2026-10-07T12:00:00.000Z");
    const rows = [
      { id: "fresh", title: "Fresh", caption: null, media_path: "tenant-a/fresh.webp", media_type: "image", product_id: null, status: "published", updated_at: "2026-10-07T11:00:00.000Z" },
      { id: "expired", title: "Expired", caption: null, media_path: "tenant-a/old.webp", media_type: "image", product_id: null, status: "published", updated_at: "2026-10-06T11:00:00.000Z" },
    ];
    let orderCalls = 0;
    const query = {
      select: vi.fn(), eq: vi.fn(), order: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockImplementation(() => ++orderCalls === 1 ? query : Promise.resolve({ data: rows, error: null }));
    const client = {
      from: vi.fn(() => query),
      storage: { from: vi.fn(() => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: `https://assets.test/${path}` } }) })) },
    };
    const stories = await loadStoreStories(client as never, "tenant-a", true, now);
    expect(query.eq).toHaveBeenCalledWith("tenant_id", "tenant-a");
    expect(query.eq).toHaveBeenCalledWith("status", "published");
    expect(stories.map(story => story.id)).toEqual(["fresh"]);
  });
});
