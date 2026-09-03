"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/nav";

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="px-3 text-xs font-medium tracking-wide text-ink-faint">
            {section.label}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {section.items.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-medium transition-colors",
                      isActive
                        ? "bg-brand-tint text-brand-ink"
                        : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
                    )}
                  >
                    <Icon
                      size={18}
                      strokeWidth={2}
                      className={isActive ? "text-brand" : "text-ink-faint"}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
