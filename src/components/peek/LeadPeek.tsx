import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-2 py-1 text-[13px]">
      <div className="text-muted-foreground">{label}</div>
      <div className="min-w-0 truncate">{children || <span className="text-muted-foreground">Empty</span>}</div>
    </div>
  );
}

function CopyText({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">Empty</span>;
  return (
    <span className="flex items-center gap-1.5">
      <span className="truncate">{value}</span>
      <button type="button" aria-label="Copy" className="text-muted-foreground hover:text-foreground"
        onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}>
        <Copy className="size-3" />
      </button>
    </span>
  );
}

const d = (v?: string | null) => (v ? fmtDate(v) : null);

export function LeadPeek({ leadId, onClose }: { leadId: string | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["leads", "peek", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const sb = supabase as any;
      const { data: lead, error } = await sb
        .from("leads")
        .select("*, stages:stage_id(name), channels:channel_id(name), sender_accounts:sender_account_id(*)")
        .eq("id", leadId)
        .single();
      if (error) throw error;
      const [contacts, followups, events, crm] = await Promise.all([
        sb.from("lead_contacts").select("*").eq("lead_id", leadId).order("is_primary", { ascending: false }).order("order_index"),
        sb.from("lead_followups").select("*").eq("lead_id", leadId).order("sequence_number"),
        sb.from("lead_events").select("*").eq("lead_id", leadId).order("occurred_at", { ascending: false }).limit(5),
        sb.from("crm_records").select("id").eq("lead_id", leadId).maybeSingle(),
      ]);
      return { lead, contacts: contacts.data ?? [], followups: followups.data ?? [], events: events.data ?? [], crmId: crm.data?.id ?? null };
    },
  });

  const data = q.data;
  const lead = data?.lead;
  const primary = data?.contacts?.[0];
  const sent = (data?.followups ?? []).filter((f: any) => f.sent_at);
  const lastOutreach = lead
    ? [lead.email_sent_at, lead.last_contacted_at, ...sent.map((f: any) => f.sent_at)]
        .filter(Boolean).sort((a: string, b: string) => +new Date(b) - +new Date(a))[0]
    : null;
  const nextDue = (data?.followups ?? []).find((f: any) => !f.sent_at && f.due_date)?.due_date ?? lead?.next_followup_date;

  return (
    <Sheet open={!!leadId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[440px]">
        {q.isError ? (
          <div className="p-4 text-[13px] text-destructive">Could not load this lead.</div>
        ) : !lead ? (
          <div className="label-text p-4">Loading...</div>
        ) : (
          <div className="space-y-5">
            <SheetHeader>
              <SheetTitle className="text-[20px]">{lead.company_name}</SheetTitle>
              <div className="label-text">{lead.lead_code}{lead.is_archived ? " · Archived" : ""}{data?.crmId ? " · In CRM" : ""}</div>
            </SheetHeader>

            <div>
              <Row label="Stage">{lead.stages?.name}</Row>
              <Row label="Channel">{lead.channels?.name}</Row>
              <Row label="Sender">{lead.sender_accounts?.label}</Row>
              <Row label="Follow-ups done">{`${sent.length} of ${data!.followups.length}`}</Row>
              <Row label="Next follow-up">{d(nextDue)}</Row>
              <Row label="Last outreach">{d(lastOutreach)}</Row>
              <Row label="Added">{d(lead.date_added ?? lead.created_at)}</Row>
            </div>

            <div>
              <div className="label-text mb-1">People ({data!.contacts.length})</div>
              <Row label="Name">{primary?.person_name}</Row>
              <Row label="Email"><CopyText value={primary?.email ?? null} /></Row>
              <Row label="LinkedIn"><CopyText value={primary?.linkedin_url ?? null} /></Row>
              <Row label="Website"><CopyText value={lead.website ?? null} /></Row>
            </div>

            <div>
              <div className="label-text mb-1">Email</div>
              <Row label="Sent">{d(lead.email_sent_at)}</Row>
              <Row label="Viewed">{d(lead.email_viewed_at)}</Row>
              <Row label="Replied">{d(lead.email_replied_at)}</Row>
              <Row label="Reply mood"><span className="capitalize">{lead.reply_sentiment}</span></Row>
              <Row label="Call booked">{d(lead.meeting_booked_at)}</Row>
            </div>

            <div>
              <div className="label-text mb-1">Recent activity</div>
              {data!.events.length === 0 ? (
                <div className="text-[13px] text-muted-foreground">None</div>
              ) : (
                data!.events.map((e: any) => (
                  <div key={e.id} className="flex justify-between gap-2 py-0.5 text-[12.5px]">
                    <span className="truncate">{String(e.event_type).replace(/_/g, " ")}</span>
                    <span className="label-text shrink-0">{fmtDate(e.occurred_at)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/lt/leads/$id" params={{ id: lead.id }} onClick={onClose}>
                  <ExternalLink className="size-3.5" /> Open full page
                </Link>
              </Button>
              {data?.crmId && (
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/crm/records/$id" params={{ id: data.crmId }} onClick={onClose}>CRM record</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
