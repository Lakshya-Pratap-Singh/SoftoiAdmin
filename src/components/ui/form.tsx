import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-muted">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

const fieldClass =
  "rounded-md border border-border bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors focus:border-brand disabled:opacity-60";

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn(fieldClass, props.className)} />;
}

export function Select(props: React.ComponentProps<"select">) {
  return <select {...props} className={cn(fieldClass, "bg-surface", props.className)} />;
}

export function Textarea(props: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(fieldClass, "resize-none", props.className)} />;
}

export function SubmitButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="submit"
      className={cn(
        "rounded-md bg-brand px-5 py-2.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "rounded-md border border-border bg-surface px-5 py-2.5 text-[15px] font-medium text-ink transition-colors hover:bg-surface-sunken",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
