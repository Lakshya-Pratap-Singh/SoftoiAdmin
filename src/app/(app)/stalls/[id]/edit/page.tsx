import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { StallForm } from "@/components/stalls/stall-form";
import { updateStall } from "@/lib/actions/stalls";

export default async function EditStallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stall = await prisma.stall.findUnique({ where: { id } });
  if (!stall) notFound();

  const boundAction = updateStall.bind(null, id);

  return (
    <div>
      <PageHeader title="Edit Stall" description={stall.name} />
      <StallForm
        action={boundAction}
        defaults={{
          name: stall.name,
          location: stall.location ?? undefined,
          mallName: stall.mallName ?? undefined,
          eventName: stall.eventName ?? undefined,
          startDate: stall.startDate?.toISOString().slice(0, 10),
          endDate: stall.endDate?.toISOString().slice(0, 10),
          status: stall.status,
          notes: stall.notes ?? undefined,
        }}
      />
    </div>
  );
}
