import { cn } from "@/lib/utils";

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium",
        tone === "good" && "bg-good-tint text-good",
        tone === "warn" && "bg-warn-tint text-warn",
        tone === "bad" && "bg-bad-tint text-bad",
        tone === "neutral" && "bg-surface-sunken text-ink-muted"
      )}
    >
      {label}
    </span>
  );
}
