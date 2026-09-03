export type StockStatus = "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK";

export function getStockStatus(currentStock: number, minimumStock: number): StockStatus {
  if (currentStock === 0) return "OUT_OF_STOCK";
  if (currentStock <= minimumStock) return "LOW_STOCK";
  return "IN_STOCK";
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  OUT_OF_STOCK: "Out of stock",
  LOW_STOCK: "Low stock",
  IN_STOCK: "In stock",
};

export const STOCK_STATUS_TONE: Record<StockStatus, "good" | "warn" | "bad"> = {
  OUT_OF_STOCK: "bad",
  LOW_STOCK: "warn",
  IN_STOCK: "good",
};
