import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { ArtisanForm } from "@/components/artisans/artisan-form";
import { updateArtisan } from "@/lib/actions/artisans";

export default async function EditArtisanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artisan = await prisma.artisan.findUnique({ where: { id } });
  if (!artisan) notFound();

  const boundAction = updateArtisan.bind(null, id);

  return (
    <div>
      <PageHeader title="Edit Artisan" description={`${artisan.name} - ${artisan.code}`} />
      <div className="max-w-lg rounded-lg border border-border bg-surface p-6">
        <ArtisanForm
          action={boundAction}
          mode="edit"
          defaults={{
            name: artisan.name,
            type: artisan.type,
            phone: artisan.phone ?? undefined,
            notes: artisan.notes ?? undefined,
          }}
        />
      </div>
    </div>
  );
}