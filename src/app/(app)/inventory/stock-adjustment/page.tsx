import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { StockAdjustmentForm } from "@/components/inventory/stock-adjustment-form";

export default async function StockAdjustmentPage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true, productCode: true, currentStock: true, sellingPrice: true, imageUrl: true },
  });

  const productsForClient = products.map((p) => ({
    ...p,
    sellingPrice: p.sellingPrice?.toString() ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Stock Adjustment"
        description="Correct system stock to match a physical count."
      />
      <div className="max-w-xl rounded-lg border border-border bg-surface p-6">
        <StockAdjustmentForm products={productsForClient} />
      </div>
    </div>
  );
}