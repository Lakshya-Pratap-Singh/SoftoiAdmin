import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { ProductForm } from "@/components/products/product-form";
import { updateProduct } from "@/lib/actions/products";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, artisans, componentOptions, existingBom] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.artisan.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        productType: { in: ["RAW_MATERIAL", "COMPONENT"] },
        NOT: { id },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, productType: true },
    }),
    prisma.productComponent.findMany({
      where: { finishedProductId: id },
      select: { componentProductId: true, quantity: true },
    }),
  ]);
  if (!product) notFound();

  const boundAction = updateProduct.bind(null, id);

  return (
    <div>
      <PageHeader title="Edit Product" description={product.name} />
      <ProductForm
        action={boundAction}
        categories={categories}
        artisans={artisans}
        componentOptions={componentOptions}
        mode="edit"
        defaults={{
          name: product.name,
          sku: product.sku ?? undefined,
          categoryId: product.categoryId ?? undefined,
          artisanId: product.artisanId ?? undefined,
          productType: product.productType,
          description: product.description ?? undefined,
          imageUrl: product.imageUrl ?? undefined,
          minimumStock: product.minimumStock,
          costPrice: product.costPrice?.toString(),
          sellingPrice: product.sellingPrice?.toString(),
          notes: product.notes ?? undefined,
          bomRows: existingBom.map((r) => ({
            componentProductId: r.componentProductId,
            quantity: r.quantity.toString(),
          })),
        }}
      />
    </div>
  );
}