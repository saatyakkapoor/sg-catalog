import {
  findCatalogProducts,
  parseSort,
} from "@/lib/catalog";
import { mediaSrc } from "@/lib/media";
import { LiveHome } from "@/components/public/live-catalog";

export default async function HomePage() {
  const latest = await findCatalogProducts({
    sort: parseSort(undefined, "designNumber"),
    pageSize: 400,
  });

  const designs = latest.products.map((product) => ({
    id: product.id,
    designNumber: product.designNumber,
    name: product.name,
    imageSrc: mediaSrc(product.image, "card"),
    slug: product.slug,
  }));

  return <LiveHome fallback={designs} />;
}
