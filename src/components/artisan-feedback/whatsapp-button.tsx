"use client";

// The one action on the customer page. It is a plain link to the wa.me URL,
// so it works with no JavaScript at all. The click handler only fires a
// best-effort "button tapped" beacon for the admin stats — it never delays or
// blocks opening WhatsApp, and a failure is silently ignored.

export function WhatsAppButton({ href, token }: { href: string; token: string }) {
  function reportTap() {
    try {
      navigator.sendBeacon?.(`/feedback/${encodeURIComponent(token)}/opened`);
    } catch {
      /* stats are optional */
    }
  }

  return (
    <a
      href={href}
      onClick={reportTap}
      rel="noopener noreferrer"
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-4 text-[17px] font-medium text-white shadow-sm transition-transform active:scale-[0.98]"
    >
      <span aria-hidden>💜</span> Thank the Artisan on WhatsApp
    </a>
  );
}
