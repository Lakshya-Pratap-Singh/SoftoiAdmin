import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Tags,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  History,
  AlertTriangle,
  ClipboardList,
  ShoppingCart,
  Store,
  Users,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Main",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Categories", href: "/categories", icon: Tags },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Inventory", href: "/inventory", icon: Boxes },
      { label: "Stock In", href: "/inventory/stock-in", icon: ArrowDownToLine },
      { label: "Stock Out", href: "/inventory/stock-out", icon: ArrowUpFromLine },
      { label: "Stock Adjustment", href: "/inventory/stock-adjustment", icon: SlidersHorizontal },
      { label: "Stock History", href: "/inventory/stock-history", icon: History },
      { label: "Low Stock", href: "/inventory/low-stock", icon: AlertTriangle },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Orders", href: "/orders", icon: ClipboardList },
      { label: "POS", href: "/pos", icon: ShoppingCart },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Stalls & Events", href: "/stalls", icon: Store },
      { label: "Customers", href: "/customers", icon: Users },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];
