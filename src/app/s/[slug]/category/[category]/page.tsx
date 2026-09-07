import { CatalogListing } from "@/components/store/catalog-listing";
import { notFound } from "next/navigation";
export default async function CategoryPage({ params }: { params: Promise<{ slug: string; category: string }> }) {
  const { slug, category } = await params;
  let decoded: string;
  try { decoded = decodeURIComponent(category); } catch { notFound(); }
  return <CatalogListing slug={slug} category={decoded}/>;
}
