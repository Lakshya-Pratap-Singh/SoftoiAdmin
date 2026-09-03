import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const settings = await prisma.settings.findFirst();

  return (
    <div>
      <PageHeader title="Settings" description="Business details, currency, and inventory defaults." />
      <SettingsForm
        defaults={{
          businessName: settings?.businessName ?? "Softoi",
          businessLogoUrl: settings?.businessLogoUrl ?? "",
          currency: settings?.currency ?? "INR",
          defaultMinimumStock: settings?.defaultMinimumStock ?? 0,
          allowNegativeStock: settings?.allowNegativeStock ?? false,
        }}
      />
    </div>
  );
}
