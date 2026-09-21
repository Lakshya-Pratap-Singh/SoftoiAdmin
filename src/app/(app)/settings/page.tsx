import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { SettingsForm } from "@/components/settings/settings-form";
import { ExportAllDataButton } from "@/components/settings/export-all-data-button";

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

      <div className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-1 text-[15px] font-medium text-ink">Data Export</h2>
        <p className="mb-4 text-sm text-ink-muted">
          Download every table as one Excel file (a separate sheet per table) — ready to open
          directly in Power BI, Excel, or Google Sheets. Pulls live data at the moment you click.
        </p>
        <ExportAllDataButton />
      </div>
    </div>
  );
}