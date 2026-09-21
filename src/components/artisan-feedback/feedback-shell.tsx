// Frame for every public customer page: brand mark on top, content centred,
// one quiet line at the bottom. Server component (no client JS needed).

export type PublicBrand = { name: string; logoUrl: string | null };

export function FeedbackShell({
  brand = { name: "Softoi", logoUrl: null },
  children,
}: {
  brand?: PublicBrand;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center px-6 pb-8 pt-10 text-center">
      <header>
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} alt={brand.name} className="mx-auto h-11 w-auto max-w-[180px] object-contain" referrerPolicy="no-referrer" />
        ) : (
          <p className="font-display text-4xl italic text-brand-ink">{brand.name}</p>
        )}
      </header>
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 py-8">{children}</div>
      <footer className="text-xs text-ink-faint">Made by hand, with care.</footer>
    </main>
  );
}

/** Message-only state (disabled, unavailable, not found, error). */
export function FeedbackMessage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <>
      <span aria-hidden className="text-4xl">🧶</span>
      <h1 className="font-display text-2xl font-medium leading-snug text-brand-ink">{title}</h1>
      {children && <p className="max-w-[28ch] text-[15px] leading-relaxed text-ink-muted">{children}</p>}
    </>
  );
}
