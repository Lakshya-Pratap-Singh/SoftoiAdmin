"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateProductCode } from "@/lib/id-generators";
import { auth } from "@/lib/auth";
import type { ActionState } from "@/lib/actions/categories";

type ImportedProduct = {
  name: string;
  sku: string;
  category: string;
  productType: string;
  initialStock: string;
  minimumStock: string;
  costPrice: string;
  sellingPrice: string;
  imageUrl: string;
};

type ImportResult = { imported: number; skipped: number; messages: string[]; error?: string };

function parseDecimal(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

export async function createProduct(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const initialQuantityRaw = String(formData.get("initialQuantity") ?? "").trim();
  const initialQuantity = Number(initialQuantityRaw);

  if (!name) return { error: "Product name is required." };
  if (!initialQuantityRaw || !Number.isFinite(initialQuantity) || initialQuantity < 0) {
    return { error: "Initial quantity must be a number of 0 or more." };
  }

  const sku = String(formData.get("sku") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const artisanId = String(formData.get("artisanId") ?? "").trim();
  const productType = String(formData.get("productType") ?? "FINISHED_PRODUCT");
  const description = String(formData.get("description") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const minimumStockRaw = String(formData.get("minimumStock") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const costPrice = parseDecimal(formData.get("costPrice"));
  const sellingPrice = parseDecimal(formData.get("sellingPrice"));

  if (sku) {
    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) return { error: `SKU "${sku}" is already in use.` };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const productCode = await generateProductCode();
      const product = await tx.product.create({
        data: {
          productCode,
          name,
          sku: sku || null,
          categoryId: categoryId || null,
          artisanId: artisanId || null,
          productType: productType as never,
          description: description || null,
          imageUrl: imageUrl || null,
          currentStock: initialQuantity,
          minimumStock: minimumStockRaw ? Number(minimumStockRaw) : 0,
          costPrice,
          sellingPrice,
          notes: notes || null,
        },
      });

      if (initialQuantity > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            movementType: "INITIAL_STOCK",
            quantity: initialQuantity,
            previousQuantity: 0,
            newQuantity: initialQuantity,
            reason: "Initial stock on product creation",
            referenceType: "PRODUCT_CREATION",
            referenceId: product.id,
          },
        });
      }
    });
  } catch {
    return { error: "Something went wrong creating the product. Please try again." };
  }

  revalidatePath("/products");
  revalidatePath("/");
  redirect("/products");
}

function normalizedName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** Creates imported products with the same initial-stock ledger entry as the product form. */
export async function importProducts(rows: ImportedProduct[]): Promise<ImportResult> {
  const session = await auth();
  if (!session?.user?.id) return { imported: 0, skipped: 0, messages: [], error: "You must be signed in to import products." };
  if (!Array.isArray(rows) || rows.length === 0) return { imported: 0, skipped: 0, messages: [], error: "There are no valid rows to import." };
  if (rows.length > 500) return { imported: 0, skipped: 0, messages: [], error: "Import up to 500 products at a time." };

  const categories = await prisma.category.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true } });
  const categoryByName = new Map(categories.map((category) => [normalizedName(category.name), category.id]));
  const requestedSkus = rows.map((row) => row.sku.trim()).filter(Boolean);
  const existing = requestedSkus.length
    ? await prisma.product.findMany({ where: { sku: { in: requestedSkus } }, select: { sku: true } })
    : [];
  const existingSkus = new Set(existing.map((product) => normalizedName(product.sku ?? "")));
  const seenSkus = new Set<string>();
  const validTypes = new Set(["FINISHED_PRODUCT", "RAW_MATERIAL", "COMPONENT"]);
  let skipped = 0;
  const messages: string[] = [];

  // Validate every row in memory first — no DB calls in this loop. Each
  // product used to generate its code and insert via a separate round
  // trip, so 81 rows meant hundreds of sequential queries to Neon, easily
  // exceeding a serverless function's time limit and silently truncating
  // the import partway through. Everything below is written in a small,
  // fixed number of batched calls instead, regardless of row count.
  type PreparedRow = {
    rowNumber: number;
    name: string;
    sku: string | null;
    categoryId: string | null;
    productType: string;
    initialStock: number;
    minimumStock: number;
    costPrice: number | null;
    sellingPrice: number | null;
    imageUrl: string | null;
  };
  const prepared: PreparedRow[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const name = String(row.name ?? "").trim();
    const sku = String(row.sku ?? "").trim();
    const categoryId = row.category ? categoryByName.get(normalizedName(String(row.category))) : undefined;
    const initialStock = Number(row.initialStock);
    const minimumStock = row.minimumStock ? Number(row.minimumStock) : 0;
    const costPrice = row.costPrice ? Number(row.costPrice) : null;
    const sellingPrice = row.sellingPrice ? Number(row.sellingPrice) : null;
    const type = String(row.productType ?? "FINISHED_PRODUCT").trim() || "FINISHED_PRODUCT";
    const imageUrl = String(row.imageUrl ?? "").trim() || null;
    const rowNumber = index + 2;
    let reason = "";

    if (!name) reason = "Product name is required.";
    else if (!Number.isInteger(initialStock) || initialStock < 0) reason = "Initial stock must be a whole number of 0 or more.";
    else if (!Number.isInteger(minimumStock) || minimumStock < 0) reason = "Minimum stock must be a whole number of 0 or more.";
    else if ((costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) || (sellingPrice !== null && (!Number.isFinite(sellingPrice) || sellingPrice < 0))) reason = "Prices must be valid positive numbers.";
    else if (row.category && !categoryId) reason = "Category does not exist or is archived.";
    else if (!validTypes.has(type)) reason = "Product type is invalid.";
    else if (sku && (existingSkus.has(normalizedName(sku)) || seenSkus.has(normalizedName(sku)))) reason = "SKU already exists.";

    if (reason) {
      skipped += 1;
      if (messages.length < 10) messages.push(`Row ${rowNumber}: ${reason}`);
      continue;
    }
    if (sku) seenSkus.add(normalizedName(sku));

    prepared.push({
      rowNumber,
      name,
      sku: sku || null,
      categoryId: categoryId ?? null,
      productType: type,
      initialStock,
      minimumStock,
      costPrice,
      sellingPrice,
      imageUrl,
    });
  }

  if (prepared.length === 0) {
    revalidatePath("/products");
    return { imported: 0, skipped, messages };
  }

  let imported = 0;

  try {
    // One count() call for the whole batch — codes are then assigned
    // sequentially in memory rather than re-querying per row.
    const startCount = await prisma.product.count();
    const codedRows = prepared.map((row, i) => ({
      ...row,
      productCode: `SOF-${String(startCount + i + 1).padStart(4, "0")}`,
    }));

    await prisma.product.createMany({
      data: codedRows.map((row) => ({
        productCode: row.productCode,
        name: row.name,
        sku: row.sku,
        categoryId: row.categoryId,
        productType: row.productType as never,
        currentStock: row.initialStock,
        minimumStock: row.minimumStock,
        costPrice: row.costPrice,
        sellingPrice: row.sellingPrice,
        imageUrl: row.imageUrl,
      })),
    });

    // createMany doesn't return the created rows, so fetch back just the
    // id + code pairs we need to write matching stock-movement entries.
    const createdProducts = await prisma.product.findMany({
      where: { productCode: { in: codedRows.map((r) => r.productCode) } },
      select: { id: true, productCode: true },
    });
    const idByCode = new Map(createdProducts.map((p) => [p.productCode, p.id]));

    const movementRows = codedRows
      .filter((row) => row.initialStock > 0)
      .map((row) => {
        const productId = idByCode.get(row.productCode);
        if (!productId) return null;
        return {
          productId,
          movementType: "INITIAL_STOCK" as const,
          quantity: row.initialStock,
          previousQuantity: 0,
          newQuantity: row.initialStock,
          reason: "Initial stock on product import",
          referenceType: "PRODUCT_IMPORT" as const,
          referenceId: productId,
          createdById: session.user.id,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (movementRows.length > 0) {
      await prisma.stockMovement.createMany({ data: movementRows });
    }

    imported = createdProducts.length;
  } catch (err) {
    console.error("[importProducts] batch insert failed:", err);
    return {
      imported: 0,
      skipped: rows.length,
      messages: [],
      error: "Something went wrong importing products. Please try again — if it keeps failing, try a smaller file.",
    };
  }

  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/inventory/stock-history");
  revalidatePath("/");
  return { imported, skipped, messages };
}

export async function updateProduct(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Product name is required." };

  const sku = String(formData.get("sku") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const artisanId = String(formData.get("artisanId") ?? "").trim();
  const productType = String(formData.get("productType") ?? "FINISHED_PRODUCT");
  const description = String(formData.get("description") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const minimumStockRaw = String(formData.get("minimumStock") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const costPrice = parseDecimal(formData.get("costPrice"));
  const sellingPrice = parseDecimal(formData.get("sellingPrice"));

  if (sku) {
    const existingSku = await prisma.product.findFirst({ where: { sku, NOT: { id } } });
    if (existingSku) return { error: `SKU "${sku}" is already in use.` };
  }

  await prisma.product.update({
    where: { id },
    data: {
      name,
      sku: sku || null,
      categoryId: categoryId || null,
      artisanId: artisanId || null,
      productType: productType as never,
      description: description || null,
      imageUrl: imageUrl || null,
      minimumStock: minimumStockRaw ? Number(minimumStockRaw) : 0,
      costPrice,
      sellingPrice,
      notes: notes || null,
    },
  });

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  revalidatePath("/");
  redirect(`/products/${id}`);
}

export async function archiveProduct(id: string) {
  "use server";
  await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
}

export async function restoreProduct(id: string) {
  "use server";
  await prisma.product.update({ where: { id }, data: { status: "ACTIVE" } });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
}