import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { FeedbackMessage, FeedbackShell } from "@/components/artisan-feedback/feedback-shell";
import { WhatsAppButton } from "@/components/artisan-feedback/whatsapp-button";
import { isLikelyBot } from "@/lib/artisan-feedback/bots";
import { logResolveIssue } from "@/lib/artisan-feedback/log";
import { getPublicBrand, recordScan, resolvePublicFeedback } from "@/lib/artisan-feedback/service";

// Public page: what the QR code opens. Must render fresh on every scan —
// it changes when a QR is disabled and it counts scans.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thank the artisan — Softoi",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const result = await resolvePublicFeedback(prisma, token);

  if (result.kind === "invalid") {
    logResolveIssue("invalid_token", { token });
    notFound();
  }

  const brand = await getPublicBrand(prisma);

  if (result.kind === "disabled" || result.kind === "expired") {
    logResolveIssue(result.kind, { token, qrId: result.qrId });
    return (
      <FeedbackShell brand={brand}>
        <FeedbackMessage title="Thank you for your support! 💜">
          {result.kind === "expired" ? "This appreciation link has expired." : "This appreciation link is no longer active."}
        </FeedbackMessage>
      </FeedbackShell>
    );
  }

  // Count the scan after the response is sent, so it never slows the page
  // and a stats hiccup can't break the customer's experience. Crawlers and
  // link-preview bots are not counted as scans.
  const userAgent = (await headers()).get("user-agent");
  if (!isLikelyBot(userAgent)) {
    after(async () => {
      try {
        await recordScan(prisma, token);
      } catch (err) {
        console.error("[artisan-feedback] could not record scan:", err);
      }
    });
  }

  if (result.kind === "unavailable") {
    logResolveIssue(result.reason, { token, qrId: result.qrId, artisanCode: result.artisanCode });
    return (
      <FeedbackShell brand={brand}>
        <FeedbackMessage title="Thank you for your support! 💜">
          This appreciation link is temporarily unavailable.
        </FeedbackMessage>
      </FeedbackShell>
    );
  }

  return (
    <FeedbackShell brand={brand}>
      {/* The one memorable thing: the product, held in a hand-stitched ring. */}
      <div className="rounded-full border-2 border-dashed border-brand/70 p-2.5">
        {result.productImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.productImageUrl}
            alt={result.productName}
            referrerPolicy="no-referrer"
            className="h-40 w-40 rounded-full border border-border object-cover"
          />
        ) : (
          <span aria-hidden className="flex h-40 w-40 items-center justify-center rounded-full bg-brand-tint text-6xl">
            🧶
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="font-display text-[26px] font-medium leading-tight text-brand-ink">
          Thank you for supporting handmade craftsmanship 💜
        </h1>
        <p className="text-[15px] leading-relaxed text-ink-muted">
          Send a little appreciation to the artisan who made your product.
        </p>
        <p className="text-[17px] font-medium text-ink">{result.productName}</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <WhatsAppButton href={result.whatsappUrl} token={token} />
        <p className="text-xs leading-relaxed text-ink-faint">
          WhatsApp opens with your message already written. Just press Send.
        </p>
      </div>
    </FeedbackShell>
  );
}
