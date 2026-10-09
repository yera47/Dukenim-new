import type { BusinessVertical } from "@/types/database";

export function storyExampleFor(vertical: BusinessVertical | null | undefined) {
  if (vertical === "food") return { src: "/examples/stories/food.webp", title: "Новинка к завтраку", caption: "Фото · короткий текст · переход к товару" };
  if (vertical === "fashion") return { src: "/examples/stories/fashion.webp", title: "Новая коллекция", caption: "Фото · короткий текст · переход к товару" };
  return { src: "/examples/stories/home.webp", title: "Детали для дома", caption: "Фото · короткий текст · переход к товару" };
}
