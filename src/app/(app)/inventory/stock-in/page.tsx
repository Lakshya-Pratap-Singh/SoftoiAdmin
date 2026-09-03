import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { StockInForm } from "@/components/inventory/stock-in-form";

export default async function StockInPage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true, productCode: true, currentStock: true, sellingPrice: true },
  });

  const productsForClient = products.map((p) => ({
    ...p,
    sellingPrice: p.sellingPrice?.toString() ?? null,
  }));

  return (
    <div>
      <PageHeader title="Stock In" description="Record new stock arriving — production, purchases, or returns." />
      <div className="max-w-xl rounded-lg border border-border bg-surface p-6">
        <StockInForm products={productsForClient} />
      </div>
    </div>
  );
}
