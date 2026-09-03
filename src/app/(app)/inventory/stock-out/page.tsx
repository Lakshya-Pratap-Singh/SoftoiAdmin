import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { StockOutForm } from "@/components/inventory/stock-out-form";

export default async function StockOutPage() {
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
      <PageHeader title="Stock Out" description="Remove stock for sales, damage, samples, or personal use." />
      <div className="max-w-xl rounded-lg border border-border bg-surface p-6">
        <StockOutForm products={productsForClient} />
      </div>
    </div>
  );
}
