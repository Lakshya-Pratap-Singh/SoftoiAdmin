import { FeedbackMessage, FeedbackShell } from "@/components/artisan-feedback/feedback-shell";

export default function FeedbackNotFound() {
  return (
    <FeedbackShell>
      <FeedbackMessage title="We couldn't find this link">
        Check that the whole QR code is in view and scan it again.
      </FeedbackMessage>
    </FeedbackShell>
  );
}
