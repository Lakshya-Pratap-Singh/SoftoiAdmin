import { PageHeader } from "@/components/ui/card";
import { ArtisanForm } from "@/components/artisans/artisan-form";
import { createArtisan } from "@/lib/actions/artisans";

export default function NewArtisanPage() {
  return (
    <div>
      <PageHeader title="Add Artisan" description="Create a new artisan profile." />
      <div className="max-w-lg rounded-lg border border-border bg-surface p-6">
        <ArtisanForm action={createArtisan} mode="create" />
      </div>
    </div>
  );
}