import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

// Small product thumbnail used everywhere a product is listed (tables,
// the stock-form combobox, POS tiles, product detail). Falls back to a
// neutral placeholder icon when the product has no imageUrl, so callers
// never need their own conditional.
export function ProductAvatar({
  src,
  alt,
  size = 36,
  rounded = "full",
  className,
}: {
  src?: string | null;
  alt: string;
  size?: number;
  rounded?: "full" | "md";
  className?: string;
}) {
  const dimension = { width: size, height: size };
  const shape = rounded === "full" ? "rounded-full" : "rounded-md";

  if (!src) {
    return (
      <span
        style={dimension}
        className={cn(
          "flex shrink-0 items-center justify-center border border-border bg-surface-sunken text-ink-faint",
          shape,
          className
        )}
      >
        <Package size={Math.round(size * 0.5)} />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      style={dimension}
      className={cn("shrink-0 border border-border object-cover", shape, className)}
    />
  );
}