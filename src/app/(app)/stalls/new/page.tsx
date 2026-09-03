import { PageHeader } from "@/components/ui/card";
import { StallForm } from "@/components/stalls/stall-form";
import { createStall } from "@/lib/actions/stalls";

export default function NewStallPage() {
  return (
    <div>
      <PageHeader title="Add Stall" description="Create a new stall or event location." />
      <StallForm action={createStall} />
    </div>
  );
}
