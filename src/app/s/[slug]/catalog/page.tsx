import { CatalogListing } from "@/components/store/catalog-listing";
export default async function CatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; return <CatalogListing slug={slug}/>;
}
