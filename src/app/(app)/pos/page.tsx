import { prisma } from "@/lib/prisma";
import { PosScreen } from "@/components/pos/pos-screen";

export default async function PosPage() {
  const [products, stalls, categories] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        productCode: true,
        currentStock: true,
        sellingPrice: true,
        imageUrl: true,
        categoryId: true,
      },
    }),
    prisma.stall.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const productsForClient = products.map((p) => ({
    ...p,
    sellingPrice: p.sellingPrice?.toString() ?? null,
  }));

  return <PosScreen products={productsForClient} stalls={stalls} categories={categories} />;
}