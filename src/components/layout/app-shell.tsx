"use client";

import { useEffect, useState } from "react";
import { Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

const SIDEBAR_COLLAPSED_KEY = "softoi-sidebar-collapsed";

export function AppShell({
  children,
  userName,
  userRole,
}: {
  children: React.ReactNode;
  userName: string;
  userRole: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Remember the collapsed state across reloads — purely a per-device UI
  // preference, so localStorage is enough (no need to persist server-side).
  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  const roleLabel = userRole
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-border bg-surface transition-[width] duration-200 md:flex md:flex-col ${
          collapsed ? "md:w-16" : "md:w-64"
        }`}
      >
        <div className={`flex items-center gap-2 px-5 py-5 ${collapsed ? "justify-center px-2" : "justify-between"}`}>
          {!collapsed && (
            <div>
              <p className="font-display text-2xl italic text-brand-ink">Softoi</p>
              <p className="text-xs text-ink-faint">Admin</p>
            </div>
          )}
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapsed}
            className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <div className={`flex-1 overflow-y-auto pb-4 ${collapsed ? "px-2" : "px-3"}`}>
          <NavLinks collapsed={collapsed} />
        </div>
        <div className={`border-t border-border py-3 ${collapsed ? "px-2" : "px-3"}`}>
          {!collapsed && (
            <div className="mb-1 px-3">
              <p className="truncate text-[14px] font-medium text-ink">{userName}</p>
              <p className="text-xs text-ink-faint">{roleLabel}</p>
            </div>
          )}
          <SignOutButton collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface shadow-lg">
            <div className="flex items-center justify-between px-5 py-5">
              <div>
                <p className="font-display text-2xl italic text-brand-ink">Softoi</p>
                <p className="text-xs text-ink-faint">Admin</p>
              </div>
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-border px-3 py-3">
              <div className="mb-1 px-3">
                <p className="truncate text-[14px] font-medium text-ink">{userName}</p>
                <p className="text-xs text-ink-faint">{roleLabel}</p>
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 md:hidden">
          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken"
          >
            <Menu size={22} />
          </button>
          <p className="font-display text-lg italic text-brand-ink">Softoi Admin</p>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}