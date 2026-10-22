import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { invalidateTrackerQueries } from "@/lib/tracker-updates";
import { fmtDate } from "@/lib/format";
import { dealValueLabel } from "@/components/crm/helpers";
import type { Stage } from "@/hooks/useLookups";
import { useState } from "react";
import { RepliedDialog, isReplyStage } from "@/components/crm/RepliedDialog";

function latest(...dates: (string | null | undefined)[]) {
  const v = dates.filter(Boolean) as string[];
  if (!v.length) return null;
  return v.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-2 py-1 text-[13px]">
      <div className="text-muted-foreground">{label}</div>
      <div className="min-w-0 truncate">{children ?? <span className="text-muted-foreground">Empty</span>}</div>
    </div>
  );
}

function CopyText({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">Empty</span>;
  return (
    <span className="flex items-center gap-1.5">
      <span className="truncate">{value}</span>
      <button
        type="button"
        aria-label="Copy"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success("Copied");
        }}
      >
        <Copy className="size-3" />
      </button>
    </span>
  );
}

export function DealPeek({
  recordId,
  stages,
  onClose,
  onStageChange,
  onPatch,
}: {
  recordId: string | null;
  stages: Stage[];
  onClose: () => void;
  onStageChange: (recordId: string, stageId: string) => void;
  onPatch: (recordId: string, patch: Record<string, unknown>) => void;
}) {
  const qc = useQueryClient();
  const [replyStage, setReplyStage] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["crm_record", "peek", recordId],
    enabled: !!recordId,
    queryFn: async () => {
      const sb = supabase as any;
      const { data: rec, error } = await sb
        .from("crm_records")
        .select("*, leads(*, channels:channel_id(name), sender_accounts:sender_account_id(*))")
        .eq("id", recordId)
        .single();
      if (error) throw error;
      const leadId = rec.lead_id;
      const [contacts, followups, tasks, events] = await Promise.all([
        sb.from("lead_contacts").select("*").eq("lead_id", leadId).order("is_primary", { ascending: false }).order("order_index"),
        sb.from("lead_followups").select("*").eq("lead_id", leadId).order("sequence_number"),
        sb.from("lead_tasks").select("*").eq("lead_id", leadId).is("completed_at", null).order("due_date"),
        sb.from("lead_events").select("*").eq("lead_id", leadId).order("occurred_at", { ascending: false }).limit(5),
      ]);
      return {
        rec,
        contacts: contacts.data ?? [],
        followups: followups.data ?? [],
        tasks: tasks.data ?? [],
        events: events.data ?? [],
      };
    },
  });

  const d = q.data;
  const lead = d?.rec?.leads;
  const primary = d?.contacts?.[0];
  const sentFollowups = (d?.followups ?? []).filter((f: any) => f.sent_at);
  const lastOutreach = lead
    ? latest(lead.email_sent_at, lead.last_contacted_at, d?.rec.last_contacted_at, ...sentFollowups.map((f: any) => f.sent_at))
    : null;
  const nextFollowup = d?.rec.next_followup_date ?? lead?.next_followup_date ?? null;

  const completeTask = async (id: string) => {
    const { error } = await (supabase as any).from("lead_tasks").update({ completed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    invalidateTrackerQueries(qc, ["lead_tasks"]);
    q.refetch();
  };

  return (
    <>
    <RepliedDialog
      leadId={d?.rec?.lead_id ?? null}
      open={!!replyStage}
      onCancel={() => setReplyStage(null)}
      onDone={() => {
        if (d && replyStage) onStageChange(d.rec.id, replyStage);
        setReplyStage(null);
        q.refetch();
      }}
    />
    <Sheet open={!!recordId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[440px]">
        {!d ? (
          <div className="label-text p-4">Loading...</div>
        ) : (
          <div className="space-y-5">
            <SheetHeader>
              <SheetTitle className="text-[20px]">{lead?.company_name}</SheetTitle>
              <div className="label-text">{lead?.lead_code}</div>
            </SheetHeader>

            <div>
              <Row label="Stage">
                <select
                  className="h-7 rounded-md border border-border bg-background px-1.5 text-[13px]"
                  value={d.rec.stage_id ?? ""}
                  onChange={(e) => {
                    const st = stages.find((x) => x.id === e.target.value);
                    if (isReplyStage(st)) setReplyStage(e.target.value);
                    else onStageChange(d.rec.id, e.target.value);
                  }}
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Row>
              <Row label="Priority">
                <select
                  className="h-7 rounded-md border border-border bg-background px-1.5 text-[13px] capitalize"
                  value={d.rec.priority}
                  onChange={(e) => onPatch(d.rec.id, { priority: e.target.value })}
                >
                  {["low", "medium", "high"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Row>
              <Row label="Deal value">{dealValueLabel(stages.find((x) => x.id === d.rec.stage_id)?.is_won ? d.rec : { ...d.rec, deal_type: "one_time" })}</Row>
              <Row label="Next follow-up">
                <Input
                  type="date"
                  className="h-7 w-[150px] text-[13px]"
                  value={nextFollowup ? String(nextFollowup).slice(0, 10) : ""}
                  onChange={(e) => onPatch(d.rec.id, { next_followup_date: e.target.value || null })}
                />
              </Row>
              <Row label="Follow-ups done">{`${sentFollowups.length} of ${d.followups.length}`}</Row>
              <Row label="Last outreach">{lastOutreach ? fmtDate(lastOutreach) : null}</Row>
            </div>

            <div>
              <div className="label-text mb-1">Contact</div>
              <Row label="Name">{primary?.person_name || null}</Row>
              <Row label="Email"><CopyText value={primary?.email ?? null} /></Row>
              <Row label="LinkedIn"><CopyText value={primary?.linkedin_url ?? null} /></Row>
              <Row label="Channel">{lead?.channels?.name ?? null}</Row>
              <Row label="Sender">{lead?.sender_accounts?.label ?? null}</Row>
            </div>

            <div>
              <div className="label-text mb-1">Email</div>
              <Row label="Sent">{lead?.email_sent_at ? fmtDate(lead.email_sent_at) : null}</Row>
              <Row label="Viewed">{lead?.email_viewed_at ? fmtDate(lead.email_viewed_at) : null}</Row>
              <Row label="Replied">{lead?.email_replied_at ? fmtDate(lead.email_replied_at) : null}</Row>
              <Row label="Reply mood"><span className="capitalize">{lead?.reply_sentiment ?? ""}</span></Row>
              <Row label="Call booked">{lead?.meeting_booked_at ? fmtDate(lead.meeting_booked_at) : null}</Row>
              <Row label="Closed">{d.rec.closed_at ? fmtDate(d.rec.closed_at) : null}</Row>
            </div>

            <div>
              <div className="label-text mb-1">Open to-dos</div>
              {d.tasks.length === 0 ? (
                <div className="text-[13px] text-muted-foreground">None</div>
              ) : (
                d.tasks.map((t: any) => (
                  <label key={t.id} className="flex items-center gap-2 py-1 text-[13px]">
                    <Checkbox onCheckedChange={() => completeTask(t.id)} />
                    <span className="flex-1 truncate">{t.title}</span>
                    {t.due_date && <span className="label-text">{fmtDate(t.due_date)}</span>}
                  </label>
                ))
              )}
            </div>

            <div>
              <div className="label-text mb-1">Recent activity</div>
              {d.events.length === 0 ? (
                <div className="text-[13px] text-muted-foreground">None</div>
              ) : (
                d.events.map((e: any) => (
                  <div key={e.id} className="flex justify-between gap-2 py-0.5 text-[12.5px]">
                    <span className="truncate">{String(e.event_type).replace(/_/g, " ")}</span>
                    <span className="label-text shrink-0">{fmtDate(e.occurred_at)}</span>
                  </div>
                ))
              )}
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link to="/crm/records/$id" params={{ id: d.rec.id }}>
                <ExternalLink className="size-3.5" /> Open full page
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
}
