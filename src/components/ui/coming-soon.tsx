import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function ComingSoon({
  title,
  description,
  phase,
  icon,
}: {
  title: string;
  description: string;
  phase: string;
  icon: LucideIcon;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon}
        title={`${title} arrives in ${phase}`}
        description="The database and navigation are ready — this module's screens are built next, following the phased build order."
      />
    </div>
  );
}
