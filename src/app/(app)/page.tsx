import Link from "next/link";
import {
  Package,
  Boxes,
  AlertTriangle,
  XCircle,
  Wallet,
  Receipt,
  PlusCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  ShoppingCart,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";

async function getDashboardData() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalProducts,
    stockAgg,
    products,
    recentMovements,
    todaysOrders,
  ] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.product.aggregate({
      where: { status: "ACTIVE" },
      _sum: { currentStock: true },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        currentStock: true,
        minimumStock: true,
        costPrice: true,
      },
    }),
    prisma.stockMovement.findMany({
      take: 6,
      orderBy: { movementDate: "desc" },
      include: { product: { select: { name: true } } },
    }),
    prisma.order.findMany({
      where: { orderDate: { gte: startOfToday }, status: "COMPLETED" },
      select: { id: true, total: true },
    }),
  ]);

  const lowStock = products.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.minimumStock
  );
  const outOfStock = products.filter((p) => p.currentStock === 0);
  const inventoryValue = products.reduce((sum, p) => {
    if (!p.costPrice) return sum;
    return sum + Number(p.costPrice) * p.currentStock;
  }, 0);

  const todaysSales = todaysOrders.reduce((sum, o) => sum + Number(o.total), 0);

  return {
    totalProducts,
    totalUnits: stockAgg._sum.currentStock ?? 0,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    inventoryValue,
    lowStockProducts: lowStock
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 5),
    recentMovements,
    todaysOrdersCount: todaysOrders.length,
    todaysSales,
  };
}

const quickActions = [
  { label: "Add Product", href: "/products/new", icon: PlusCircle },
  { label: "Stock In", href: "/inventory/stock-in", icon: ArrowDownToLine },
  { label: "Stock Out", href: "/inventory/stock-out", icon: ArrowUpFromLine },
  { label: "Adjust Stock", href: "/inventory/stock-adjustment", icon: SlidersHorizontal },
  { label: "New POS Sale", href: "/pos", icon: ShoppingCart },
];

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="An overview of Softoi's products, stock, and today's sales."
      />

      {/* Inventory summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Products" value={String(data.totalProducts)} icon={Package} />
        <StatCard label="Units in Stock" value={String(data.totalUnits)} icon={Boxes} />
        <StatCard
          label="Low Stock"
          value={String(data.lowStockCount)}
          icon={AlertTriangle}
          tone="warn"
        />
        <StatCard
          label="Out of Stock"
          value={String(data.outOfStockCount)}
          icon={XCircle}
          tone="bad"
        />
        <StatCard
          label="Inventory Value"
          value={formatCurrency(data.inventoryValue)}
          icon={Wallet}
        />
      </div>

      {/* Sales summary */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <StatCard label="Today's Sales" value={formatCurrency(data.todaysSales)} icon={Wallet} />
        <StatCard label="Today's Orders" value={String(data.todaysOrdersCount)} icon={Receipt} />
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-ink-muted">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
              >
                <Icon size={16} strokeWidth={2} />
                {action.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {/* Low stock products */}
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-ink">Low stock products</h2>
            <Link href="/inventory/low-stock" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">
              Nothing is running low right now.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.lowStockProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-[14px] font-medium text-ink">{p.name}</p>
                    <p className="text-xs text-ink-muted">Minimum {p.minimumStock}</p>
                  </div>
                  <span className="rounded-md bg-warn-tint px-2.5 py-1 text-xs font-medium text-warn">
                    {p.currentStock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent stock activity */}
        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-3 text-[15px] font-medium text-ink">Recent stock activity</h2>
          {data.recentMovements.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">
              No stock movements recorded yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.recentMovements.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-[14px] font-medium text-ink">{m.product.name}</p>
                    <p className="text-xs text-ink-muted">{m.reason}</p>
                  </div>
                  <span className="text-sm font-medium text-ink-muted">
                    {m.quantity > 0 ? "+" : ""}
                    {m.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
