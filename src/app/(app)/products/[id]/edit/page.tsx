import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { ProductForm } from "@/components/products/product-form";
import { updateProduct } from "@/lib/actions/products";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  const boundAction = updateProduct.bind(null, id);

  return (
    <div>
      <PageHeader title="Edit Product" description={product.name} />
      <ProductForm
        action={boundAction}
        categories={categories}
        mode="edit"
        defaults={{
          name: product.name,
          sku: product.sku ?? undefined,
          categoryId: product.categoryId ?? undefined,
          productType: product.productType,
          description: product.description ?? undefined,
          imageUrl: product.imageUrl ?? undefined,
          minimumStock: product.minimumStock,
          costPrice: product.costPrice?.toString(),
          sellingPrice: product.sellingPrice?.toString(),
          notes: product.notes ?? undefined,
        }}
      />
    </div>
  );
}
