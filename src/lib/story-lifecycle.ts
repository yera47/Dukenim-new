export const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

export type StoryLifecycleRow = { status: "draft" | "published"; updated_at: string };
export type StoryLifecycleState = "draft" | "published" | "expired";

export function storyLifecycleState(story: StoryLifecycleRow, now = Date.now()): StoryLifecycleState {
  if (story.status !== "published") return "draft";
  const publishedAt = Date.parse(story.updated_at);
  if (!Number.isFinite(publishedAt) || publishedAt > now || publishedAt + STORY_LIFETIME_MS <= now) return "expired";
  return "published";
}

export function storyIsVisible(story: StoryLifecycleRow, now = Date.now()) {
  return storyLifecycleState(story, now) === "published";
}
