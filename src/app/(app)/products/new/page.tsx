import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { ProductForm } from "@/components/products/product-form";
import { createProduct } from "@/lib/actions/products";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="Add Product" description="Create a new product and set its initial stock." />
      <ProductForm action={createProduct} categories={categories} mode="create" />
    </div>
  );
}
