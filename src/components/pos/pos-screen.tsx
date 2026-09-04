"use client";

import { useMemo, useState, useActionState } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { createOrder } from "@/lib/actions/orders";
import { ProductAvatar } from "@/components/ui/product-avatar";

type PosProduct = {
  id: string;
  name: string;
  sku: string | null;
  productCode: string;
  currentStock: number;
  sellingPrice: string | null;
  imageUrl: string | null;
};

type CartLine = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  maxStock: number;
};

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "OTHER"];

export function PosScreen({
  products,
  stalls,
}: {
  products: PosProduct[];
  stalls: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [stallId, setStallId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [state, formAction] = useActionState(createOrder, undefined);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 24);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.productCode.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q)
      )
      .slice(0, 24);
  }, [products, query]);

  function addToCart(p: PosProduct) {
    if (p.currentStock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        if (existing.quantity >= p.currentStock) return prev;
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          unitPrice: p.sellingPrice ? Number(p.sellingPrice) : 0,
          quantity: 1,
          discount: 0,
          maxStock: p.currentStock,
        },
      ];
    });
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: Math.min(Math.max(l.quantity + delta, 1), l.maxStock) }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function setLineDiscount(productId: string, discount: number) {
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, discount: Math.max(discount, 0) } : l))
    );
  }

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity - l.discount, 0);
  const total = Math.max(subtotal - orderDiscount, 0);

  const cartPayload = JSON.stringify(
    cart.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
    }))
  );

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-8rem)] lg:grid-cols-[1fr_380px]">
      {/* Product area */}
      <div className="flex min-h-0 flex-col">
        <div className="relative mb-3">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product name, SKU, or code…"
            className="w-full rounded-md border border-border bg-surface py-3 pl-9 pr-3.5 text-[15px] text-ink outline-none focus:border-brand"
          />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto pb-2 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const outOfStock = p.currentStock <= 0;
            return (
              <button
                key={p.id}
                type="button"
                disabled={outOfStock}
                onClick={() => addToCart(p)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border border-border bg-surface p-3 text-left transition-colors",
                  outOfStock ? "cursor-not-allowed opacity-50" : "hover:border-brand"
                )}
              >
                <ProductAvatar src={p.imageUrl} alt={p.name} size={44} rounded="md" className="mb-1" />
                <p className="line-clamp-2 text-sm font-medium text-ink">{p.name}</p>
                <p className="text-xs text-ink-faint">{p.currentStock} in stock</p>
                <p className="mt-auto pt-1 text-sm font-semibold text-brand">
                  {p.sellingPrice ? formatCurrency(p.sellingPrice) : "—"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart */}
      <div className="flex min-h-0 flex-col rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShoppingCart size={18} className="text-brand" />
          <h2 className="text-[15px] font-medium text-ink">Cart</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">Tap a product to add it to the cart.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {cart.map((l) => (
                <li key={l.productId} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{l.name}</p>
                    <button
                      type="button"
                      onClick={() => removeLine(l.productId)}
                      className="text-ink-faint hover:text-bad"
                      aria-label="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => changeQty(l.productId, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-surface-sunken"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-medium text-ink">{l.quantity}</span>
                      <button
                        type="button"
                        onClick={() => changeQty(l.productId, 1)}
                        disabled={l.quantity >= l.maxStock}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-surface-sunken disabled:opacity-40"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <span className="text-sm font-medium text-ink">
                      {formatCurrency(l.unitPrice * l.quantity - l.discount)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-ink-faint">Item discount ₹</label>
                    <input
                      type="number"
                      min={0}
                      value={l.discount || ""}
                      onChange={(e) => setLineDiscount(l.productId, Number(e.target.value))}
                      className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-brand"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <form action={formAction} className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
            <input type="hidden" name="items" value={cartPayload} />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Customer name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                name="customerName"
                className="rounded-md border border-border bg-surface px-2.5 py-2 text-xs text-ink outline-none focus:border-brand"
              />
              <input
                type="text"
                placeholder="Phone (optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                name="customerPhone"
                className="rounded-md border border-border bg-surface px-2.5 py-2 text-xs text-ink outline-none focus:border-brand"
              />
            </div>
            <input type="hidden" name="customerEmail" value="" />

            <select
              name="stallId"
              value={stallId}
              onChange={(e) => setStallId(e.target.value)}
              className="rounded-md border border-border bg-surface px-2.5 py-2 text-xs text-ink outline-none focus:border-brand"
            >
              <option value="">No stall / event selected</option>
              {stalls.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input type="hidden" name="salesChannel" value="OFFLINE_STALL" />

            <div className="flex items-center justify-between text-xs">
              <label htmlFor="orderDiscount" className="text-ink-muted">
                Order discount ₹
              </label>
              <input
                id="orderDiscount"
                type="number"
                min={0}
                value={orderDiscount || ""}
                onChange={(e) => setOrderDiscount(Number(e.target.value))}
                className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-4 gap-1">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-xs font-medium",
                    paymentMethod === m
                      ? "border-brand bg-brand-tint text-brand-ink"
                      : "border-border text-ink-muted hover:bg-surface-sunken"
                  )}
                >
                  {m[0] + m.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <input type="hidden" name="paymentMethod" value={paymentMethod} />

            <div className="flex justify-between text-sm text-ink-muted">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-ink">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            {state?.error && (
              <p role="alert" className="rounded-md bg-bad-tint px-3 py-2 text-xs text-bad">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              className="rounded-md bg-brand py-3 text-[15px] font-semibold text-white hover:opacity-90"
            >
              Complete Sale
            </button>
          </form>
        )}
      </div>
    </div>
  );
}