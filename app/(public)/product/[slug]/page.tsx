import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { LiveProductView } from "@/components/public/live-product";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-static";

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { isPublished: true },
    select: { slug: true },
  });
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  return <LiveProductView slug={slug} />;
}
