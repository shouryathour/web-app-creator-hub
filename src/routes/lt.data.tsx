import { createFileRoute } from "@tanstack/react-router";
import { AppPage } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Card, downloadCsv } from "@/components/live/kit";
import { SheetSync } from "@/components/live/sheet-sync";
import { ImportWizard } from "@/components/lt/data-import-wizard";
import { collectExportPages } from "@/lib/export-pages";
import { toast } from "sonner";

export const Route = createFileRoute("/lt/data")({
  head: () => ({
    meta: [
      { title: "Import / Export | Lead Tracker | Buzzspear" },
      { name: "description", content: "Import leads from CSV or export leads and CRM records." },
      { property: "og:title", content: "Import / Export | Lead Tracker | Buzzspear" },
      { property: "og:description", content: "Import leads from CSV or export leads and CRM records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DataPage,
});

const LEAD_EXPORT_COLUMNS = [
  "id",
  "lead_code",
  "status",
  "priority",
  "company_name",
  "primary_contact",
  "country_id",
  "stage_id",
  "channel_id",
  "sender_account_id",
  "date_added",
  "website_url",
  "company_linkedin_url",
  "instagram_url",
  "youtube_url",
  "research_notes",
  "additional_notes",
  "next_followup_date",
  "archived",
  "email_sent", "email_sent_at", "email_viewed", "email_viewed_at", "email_replied", "email_replied_at", "reply_sentiment",
  "loom_url", "loom_sent", "loom_sent_at", "loom_watched", "loom_watched_at", "loom_watch_percent",
  "linkedin_connection_sent", "linkedin_connection_sent_at", "linkedin_sent", "linkedin_sent_at", "linkedin_replied", "linkedin_replied_at",
  "instagram_sent", "instagram_sent_at", "instagram_replied", "instagram_replied_at",
  "meeting_booked", "meeting_booked_at", "client_closed", "client_closed_at", "last_contacted_at",
] as const;

const CRM_EXPORT_COLUMNS = [
  "lead_id",
  "stage_id",
  "priority",
  "estimated_value",
  "currency",
  "deal_type",
  "mrr_amount",
  "contract_months",
  "probability",
  "expected_close_date",
  "closed_at",
  "owner_id",
  "notes",
  "updated_at",
] as const;

function GoogleSheetsCard() {
  return (
    <Card title="Google Sheets">
      <SheetSync />
    </Card>
  );
}

function DataPage() {
  const exportLeads = async () => {
    try {
    const rows = await collectExportPages<Record<string, unknown>>((from, to) => supabase.from("leads").select(LEAD_EXPORT_COLUMNS.join(",")).order("id").range(from, to) as unknown as PromiseLike<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>);
    downloadCsv("leads.csv", [[...LEAD_EXPORT_COLUMNS], ...rows.map((r) => LEAD_EXPORT_COLUMNS.map((c) => r[c] as string | number | null))]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Export failed"); }
  };

  const exportCrm = async () => {
    try {
    const rows = await collectExportPages<Record<string, unknown>>((from, to) => supabase.from("crm_records").select(CRM_EXPORT_COLUMNS.join(",")).order("id").range(from, to) as unknown as PromiseLike<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>);
    downloadCsv("crm_records.csv", [[...CRM_EXPORT_COLUMNS], ...rows.map((r) => CRM_EXPORT_COLUMNS.map((c) => r[c] as string | number | null))]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Export failed"); }
  };

  // Live passes guide="import" to the page shell; the repo AppPage has no guide prop yet.
  return (
    <AppPage module="lead" title="Import / Export" perm="lead.import_export">
      <div className="flex flex-col gap-4">
        <GoogleSheetsCard />
        <Card title="Export">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={exportLeads}>
              Export all leads (CSV)
            </Button>
            <Button size="sm" variant="outline" onClick={exportCrm}>
              Export CRM records (CSV)
            </Button>
          </div>
        </Card>
        <ImportWizard />
      </div>
    </AppPage>
  );
}
