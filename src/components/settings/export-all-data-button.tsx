"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { exportAllData } from "@/lib/actions/export";

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function ExportAllDataButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const result = await exportAllData();
      if ("error" in result) {
        setError(result.error);
        return;
      }

      const workbook = XLSX.utils.book_new();
      for (const table of result.tables) {
        // Excel sheet names cap at 31 characters — all our table names are
        // well under that, but truncate defensively in case one grows.
        const sheetName = table.name.slice(0, 31);
        const worksheet =
          table.rows.length > 0
            ? XLSX.utils.json_to_sheet(table.rows)
            : XLSX.utils.aoa_to_sheet([["(no rows)"]]);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
      XLSX.writeFile(workbook, `softoi-full-export-${dateStamp()}.xlsx`);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className="flex w-fit items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {loading ? "Exporting…" : "Export All Data (Excel)"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}