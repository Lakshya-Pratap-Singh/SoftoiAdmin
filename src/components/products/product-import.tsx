"use client";

import { ChangeEvent, useMemo, useState, useTransition } from "react";
import { Download, FileUp, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";
import { importProducts } from "@/lib/actions/products";

const HEADERS = [
  "Product Name",
  "SKU",
  "Category",
  "Product Type",
  "Initial Stock",
  "Minimum Stock",
  "Cost Price",
  "Selling Price",
] as const;

type ImportRow = {
  rowNumber: number;
  name: string;
  sku: string;
  category: string;
  productType: string;
  initialStock: string;
  minimumStock: string;
  costPrice: string;
  sellingPrice: string;
  errors: string[];
};

type Category = { id: string; name: string };

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
const toText = (value: unknown) => (value == null ? "" : String(value).trim());

function validateRows(values: Record<string, unknown>[], categories: Category[], existingSkus: string[]): ImportRow[] {
  const categoryNames = new Set(categories.map((category) => normalize(category.name)));
  const seenSkus = new Set(existingSkus.map(normalize));
  const permittedTypes = new Set(["FINISHED_PRODUCT", "RAW_MATERIAL", "COMPONENT"]);

  return values
    .map((value, index) => {
      const row: ImportRow = {
        rowNumber: index + 2,
        name: toText(value["Product Name"]),
        sku: toText(value.SKU),
        category: toText(value.Category),
        productType: toText(value["Product Type"]) || "FINISHED_PRODUCT",
        initialStock: toText(value["Initial Stock"]),
        minimumStock: toText(value["Minimum Stock"]),
        costPrice: toText(value["Cost Price"]),
        sellingPrice: toText(value["Selling Price"]),
        errors: [],
      };
      const blank = [row.name, row.sku, row.category, row.initialStock, row.minimumStock, row.costPrice, row.sellingPrice].every((cell) => !cell);
      if (blank) return null;
      if (!row.name) row.errors.push("Product name is required.");
      if (!row.initialStock || !Number.isInteger(Number(row.initialStock)) || Number(row.initialStock) < 0) {
        row.errors.push("Initial stock must be a whole number of 0 or more.");
      }
      if (row.minimumStock && (!Number.isInteger(Number(row.minimumStock)) || Number(row.minimumStock) < 0)) {
        row.errors.push("Minimum stock must be a whole number of 0 or more.");
      }
      for (const [label, valueToCheck] of [["Cost price", row.costPrice], ["Selling price", row.sellingPrice]] as const) {
        if (valueToCheck && (!Number.isFinite(Number(valueToCheck)) || Number(valueToCheck) < 0)) row.errors.push(`${label} must be a valid positive number.`);
      }
      if (row.category && !categoryNames.has(normalize(row.category))) row.errors.push("Category does not exist or is archived.");
      if (!permittedTypes.has(row.productType)) row.errors.push("Product type must be Finished Product, Raw Material, or Component.");
      if (row.sku) {
        const skuKey = normalize(row.sku);
        if (seenSkus.has(skuKey)) row.errors.push("SKU already exists or is duplicated in this file.");
        seenSkus.add(skuKey);
      }
      return row;
    })
    .filter((row): row is ImportRow => row !== null);
}

export function ProductImport({ categories, existingSkus }: { categories: Category[]; existingSkus: string[] }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileError, setFileError] = useState("");
  const [summary, setSummary] = useState("");
  const [isPending, startTransition] = useTransition();
  const validRows = useMemo(() => rows.filter((row) => row.errors.length === 0), [rows]);

  function downloadTemplate() {
    const worksheet = XLSX.utils.aoa_to_sheet([
      [...HEADERS],
      ["Example Product", "SKU-001", categories[0]?.name ?? "", "FINISHED_PRODUCT", 10, 2, 50, 99],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "product-import-template.xlsx");
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setRows([]);
    setSummary("");
    setFileError("");
    if (!file) return;
    setFileName(file.name);
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setFileError("Choose a CSV or XLSX file.");
      return;
    }
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
      if (!parsed.length) {
        setFileError("The selected file has no product rows.");
        return;
      }
      const headers = Object.keys(parsed[0]);
      const missing = HEADERS.filter((header) => !headers.includes(header));
      if (missing.length) {
        setFileError(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Download the template to start.`);
        return;
      }
      setRows(validateRows(parsed, categories, existingSkus));
    } catch {
      setFileError("This file could not be read. Please choose a valid CSV or XLSX file.");
    }
  }

  function runImport() {
    setSummary("");
    startTransition(async () => {
      const result = await importProducts(validRows.map((row) => ({
        name: row.name,
        sku: row.sku,
        category: row.category,
        productType: row.productType,
        initialStock: row.initialStock,
        minimumStock: row.minimumStock,
        costPrice: row.costPrice,
        sellingPrice: row.sellingPrice,
      })));
      setSummary(result.error ?? `Imported: ${result.imported}. Skipped: ${result.skipped}.${result.messages.length ? ` ${result.messages.join(" ")}` : ""}`);
      if (!result.error) setRows([]);
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken">
        <Upload size={16} /> Import Products
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" role="dialog" aria-modal="true" aria-label="Import products">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-lg border border-border bg-canvas p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><h2 className="text-lg font-semibold text-ink">Import products</h2><p className="mt-1 text-sm text-ink-muted">Upload CSV or Excel, review every row, then import valid products.</p></div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken" aria-label="Close import"><X size={18} /></button>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border bg-surface p-5">
              <FileUp size={22} className="text-brand" />
              <label className="cursor-pointer rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">Choose file<input className="sr-only" type="file" accept=".csv,.xlsx" onChange={selectFile} /></label>
              <span className="text-sm text-ink-muted">{fileName || "CSV or XLSX only"}</span>
              <button type="button" onClick={downloadTemplate} className="ml-auto flex items-center gap-2 text-sm font-medium text-brand hover:underline"><Download size={16} /> Download Template</button>
            </div>
            {fileError && <p role="alert" className="mt-4 rounded-md bg-bad-tint px-3.5 py-2.5 text-sm text-bad">{fileError}</p>}
            {rows.length > 0 && <>
              <div className="mt-4 rounded-md bg-surface-sunken px-4 py-3 text-sm text-ink">Total rows: {rows.length} · Valid: {validRows.length} · Invalid: {rows.length - validRows.length} · Skipped: 0</div>
              <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full text-left text-sm"><thead className="bg-surface-sunken text-xs text-ink-muted"><tr><th className="px-3 py-3">Row</th><th className="px-3 py-3">Product</th><th className="px-3 py-3">SKU</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Price</th><th className="px-3 py-3">Stock</th><th className="px-3 py-3">Status</th></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.rowNumber}><td className="px-3 py-3 text-ink-muted">{row.rowNumber}</td><td className="px-3 py-3 font-medium">{row.name || "—"}</td><td className="px-3 py-3">{row.sku || "—"}</td><td className="px-3 py-3">{row.category || "—"}</td><td className="px-3 py-3">{row.sellingPrice || "—"}</td><td className="px-3 py-3">{row.initialStock || "—"}</td><td className={`px-3 py-3 ${row.errors.length ? "text-bad" : "text-good"}`}>{row.errors.length ? row.errors.join(" ") : "Valid"}</td></tr>)}</tbody></table></div>
              <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" disabled={!validRows.length || isPending} onClick={runImport} className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{isPending ? "Importing…" : `Import ${validRows.length} valid row${validRows.length === 1 ? "" : "s"}`}</button>{summary && <p role="status" className="text-sm text-ink-muted">{summary}</p>}</div>
            </>}
          </div>
        </div>
      )}
    </>
  );
}
