"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-[14px] font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
    >
      <LogOut size={16} strokeWidth={2} />
      Sign out
    </button>
  );
}
