import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "warn" | "bad";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">{label}</p>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md",
            tone === "warn" && "bg-warn-tint text-warn",
            tone === "bad" && "bg-bad-tint text-bad",
            tone === "default" && "bg-brand-tint text-brand"
          )}
        >
          <Icon size={16} strokeWidth={2} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
