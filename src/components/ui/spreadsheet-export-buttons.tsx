"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";

type ExportRow = Record<string, string | number | null | undefined>;

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function SpreadsheetExportButtons({
  rows,
  filename,
}: {
  rows: ExportRow[];
  filename: string;
}) {
  function download(kind: "csv" | "xlsx") {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
    XLSX.writeFile(workbook, `${filename}-${dateStamp()}.${kind}`, { bookType: kind });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => download("csv")}
        disabled={rows.length === 0}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download size={16} /> Export CSV
      </button>
      <button
        type="button"
        onClick={() => download("xlsx")}
        disabled={rows.length === 0}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download size={16} /> Export Excel
      </button>
    </div>
  );
}
