// Ported from live chunk crm.followups-Xn82thxd.js.
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppPage } from "@/components/app-shell";
import { Card, EmptyState, Loading, addDaysISO, fmtDate, todayISO } from "@/components/live/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { openRecordPeek, peekClick } from "@/lib/peek";
import { invalidateTrackerQueries } from "@/lib/tracker-updates";

export const Route = createFileRoute("/crm/followups")({
  head: () => ({
    meta: [
      { title: "Follow-ups | CRM | Tracker | Buzzspear" },
      { name: "description", content: "Overdue, today and upcoming CRM follow-ups." },
      { property: "og:title", content: "Follow-ups | CRM | Tracker | Buzzspear" },
      { property: "og:description", content: "Overdue, today and upcoming CRM follow-ups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FollowupsPage,
});

type FollowupRow = {
  id: string;
  next_followup_date: string | null;
  leads: { company_name: string } | null;
  stage: { is_won: boolean; is_lost: boolean } | null;
};

type LogInput = { recordId: string; followedUp: string; lastContact: string; next: string };

function FollowupsPage() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["crm_followups"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_records")
        .select("id, next_followup_date, leads(company_name), stage:pipeline_stages(is_won, is_lost)")
        .order("next_followup_date", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return ((data ?? []) as FollowupRow[]).filter((r) => !r.stage?.is_won && !r.stage?.is_lost);
    },
  });
  const rows = query.data ?? [];
  const today = todayISO();
  const weekOut = addDaysISO(7);
  const overdue = rows.filter((r) => !r.next_followup_date || r.next_followup_date < today);
  const dueToday = rows.filter((r) => r.next_followup_date === today);
  const upcoming = rows.filter((r) => !!r.next_followup_date && r.next_followup_date > today && r.next_followup_date <= weekOut);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["crm_followups"] });
    invalidateTrackerQueries(qc, ["crm_records", "crm_contact_log"]);
  };

  const snooze = useMutation({
    mutationFn: async ({ id, days, from }: { id: string; days: number; from: string }) => {
      const { error } = await (supabase as any)
        .from("crm_records")
        .update({ next_followup_date: addDaysISO(days, from) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: any) => toast.error(e.message ?? "Failed to snooze"),
  });

  const logContact = useMutation({
    mutationFn: async (v: LogInput) => {
      const sb = supabase as any;
      const { error } = await sb.from("crm_contact_log").insert({
        crm_record_id: v.recordId,
        contacted_at: new Date(v.followedUp + "T12:00:00").toISOString(),
        direction: "outbound",
        summary: "Follow-up",
      });
      if (error) throw error;
      const { error: e2 } = await sb
        .from("crm_records")
        .update({ last_contacted_at: new Date(v.lastContact + "T12:00:00").toISOString(), next_followup_date: v.next })
        .eq("id", v.recordId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Follow-up logged");
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to log follow-up"),
  });

  const column = (title: string, list: FollowupRow[]) => (
    <Card title={`${title} (${list.length})`} className="min-w-0">
      {list.length === 0 ? (
        <div className="py-6 text-center text-[12px] text-muted-foreground">Nothing here</div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {list.map((r) => (
            <div key={r.id} className="flex flex-col gap-1.5 py-2">
              <Link
                to="/crm/records/$id"
                params={{ id: r.id }}
                className="text-left text-[13px] font-medium hover:underline"
                onClick={(e) => peekClick(e, () => openRecordPeek(r.id))}
              >
                {r.leads?.company_name ?? "Untitled"}
              </Link>
              <div className={r.next_followup_date ? "text-[11px] text-muted-foreground" : "text-[11px] text-destructive"}>
                {r.next_followup_date ? `Due ${fmtDate(r.next_followup_date)}` : "No follow-up date"}
              </div>
              <div className="flex items-center gap-1.5">
                <LogDialog record={r} onLog={logContact.mutate} />
                <Select onValueChange={(v) => snooze.mutate({ id: r.id, days: Number(v), from: today })}>
                  <SelectTrigger className="h-7 w-[110px] text-[11px]">
                    <SelectValue placeholder="Snooze" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Snooze 1 day</SelectItem>
                    <SelectItem value="3">Snooze 3 days</SelectItem>
                    <SelectItem value="7">Snooze 7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <AppPage guide="crm-followups" module="crm" title="Follow-ups" perm="crm.followups">
      {query.isLoading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState title="No open deals" hint="Open CRM deals show here with their follow-up dates." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {column("Overdue", overdue)}
          {column("Today", dueToday)}
          {column("Upcoming 7 days", upcoming)}
        </div>
      )}
    </AppPage>
  );
}

function LogDialog({ record, onLog }: { record: FollowupRow; onLog: (v: LogInput) => void }) {
  const [open, setOpen] = useState(false);
  const [followedUp, setFollowedUp] = useState(todayISO());
  const [lastContact, setLastContact] = useState(todayISO());
  const [next, setNext] = useState("");
  const reset = () => {
    setFollowedUp(todayISO());
    setLastContact(todayISO());
    setNext("");
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-[11px]">
          Log
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log follow-up - {record.leads?.company_name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-[13px]">
          <label className="flex flex-col gap-1">
            When did you follow up?
            <Input type="date" value={followedUp} onChange={(e) => setFollowedUp(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Last contact on
            <Input type="date" value={lastContact} onChange={(e) => setLastContact(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Next follow-up
            <Input type="date" value={next} onChange={(e) => setNext(e.target.value)} />
          </label>
          <div className="flex gap-1.5">
            {[3, 7, 14].map((d) => (
              <Button key={d} type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setNext(addDaysISO(d, followedUp || todayISO()))}>
                +{d} days
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!followedUp || !lastContact || !next}
            onClick={() => {
              onLog({ recordId: record.id, followedUp, lastContact, next });
              setOpen(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
