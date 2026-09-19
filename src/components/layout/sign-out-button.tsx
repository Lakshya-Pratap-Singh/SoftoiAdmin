"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function SignOutButton({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      title={collapsed ? "Sign out" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md py-2 text-[14px] font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink",
        collapsed ? "justify-center px-2" : "px-3"
      )}
    >
      <LogOut size={16} strokeWidth={2} className="shrink-0" />
      {!collapsed && "Sign out"}
    </button>
  );
}