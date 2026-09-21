"use client";

import { FeedbackMessage, FeedbackShell } from "@/components/artisan-feedback/feedback-shell";

// Shown if something on our side fails (e.g. the database is unreachable).
// The real error is logged by Next on the server; the customer just sees a
// calm message and a way to retry.
export default function FeedbackError({ reset }: { error: Error; reset: () => void }) {
  return (
    <FeedbackShell>
      <FeedbackMessage title="Thank you for your support! 💜">
        We couldn&apos;t load this page just now. Please try again in a moment.
      </FeedbackMessage>
      <button
        type="button"
        onClick={reset}
        className="rounded-full border border-border bg-surface px-6 py-3 text-[15px] font-medium text-ink"
      >
        Try again
      </button>
    </FeedbackShell>
  );
}
