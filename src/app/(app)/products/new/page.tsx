import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { ProductForm } from "@/components/products/product-form";
import { createProduct } from "@/lib/actions/products";

export default async function NewProductPage() {
  const [categories, artisans] = await Promise.all([
    prisma.category.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.artisan.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Add Product" description="Create a new product and set its initial stock." />
      <ProductForm action={createProduct} categories={categories} artisans={artisans} mode="create" />
    </div>
  );
}