// Ported from live chunk crm.pipeline-BrAdr9E4.js.
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AppPage } from "@/components/app-shell";
import { Dot, EmptyState, Loading, Pill } from "@/components/live/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useStages } from "@/hooks/useLookups";
import { useReportCurrency } from "@/components/crm/report-currency";
import { dealTotal } from "@/components/crm/earnings";
import { PRIORITY_COLORS, dealValueLabel } from "@/components/crm/helpers";
import { invalidateTrackerQueries } from "@/lib/tracker-updates";

export const Route = createFileRoute("/crm/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline | CRM | Tracker | Buzzspear" },
      { name: "description", content: "Kanban view of CRM deals by stage." },
      { property: "og:title", content: "Pipeline | CRM | Tracker | Buzzspear" },
      { property: "og:description", content: "Kanban view of CRM deals by stage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PipelinePage,
});

type PipelineRecord = {
  id: string;
  stage_id: string | null;
  priority: string;
  estimated_value: number | null;
  currency: string | null;
  deal_type: string | null;
  mrr_amount: number | null;
  contract_months: number | null;
  notes: string | null;
  updated_at: string;
  closed_at: string | null;
  leads: { company_name: string } | null;
};

const COLLAPSED_KEY = "tracker.pipeline.collapsed";

function PipelinePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: stages } = useStages("crm");
  const query = useQuery({
    queryKey: ["crm_pipeline_records"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_records")
        .select("*, leads(company_name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PipelineRecord[];
    },
  });
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_KEY);
      if (raw) setHidden(new Set(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleHidden = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });

  const [wonDialog, setWonDialog] = useState<{ recordId: string; stageId: string; value: string } | null>(null);
  const [lostDialog, setLostDialog] = useState<{ recordId: string; stageId: string; reason: string } | null>(null);

  const move = useMutation({
    mutationFn: async ({ recordId, patch }: { recordId: string; patch: Record<string, unknown> }) => {
      const { error } = await (supabase as any).from("crm_records").update(patch).eq("id", recordId);
      if (error) throw error;
    },
    onSuccess: () => invalidateTrackerQueries(qc, ["crm_records"]),
    onError: (e: any) => toast.error(e.message ?? "Failed to move"),
  });

  const records = query.data ?? [];
  const fx = useReportCurrency();
  const [peekId, setPeekId] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "list">("board");
  const [compact, setCompact] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "updated_at", dir: -1 });
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const v = window.localStorage.getItem("tracker.pipeline.view");
    if (v === "list" || v === "board") setView(v);
    setCompact(window.localStorage.getItem("tracker.pipeline.compact") === "1");
  }, []);
  const changeView = (v: "board" | "list") => {
    setView(v);
    window.localStorage.setItem("tracker.pipeline.view", v);
  };
  const toggleCompact = () =>
    setCompact((c) => {
      window.localStorage.setItem("tracker.pipeline.compact", c ? "0" : "1");
      return !c;
    });

  const applyStage = (recordId: string, stageId: string) => {
    const rec = records.find((r) => r.id === recordId);
    const stage = (stages ?? []).find((s) => s.id === stageId);
    if (!rec || !stage || rec.stage_id === stageId) return;
    if (stage.is_won) {
      setWonDialog({ recordId: rec.id, stageId, value: String(rec.estimated_value ?? "") });
      return;
    }
    if (stage.is_lost) {
      setLostDialog({ recordId: rec.id, stageId, reason: "" });
      return;
    }
    move.mutate({ recordId: rec.id, patch: { stage_id: stageId, probability: stage.default_probability, closed_at: null } });
  };

  const dropOn = (stageId: string) => {
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    applyStage(id, stageId);
  };

  const visibleStages = (stages ?? []).filter((s) => !hidden.has(s.id));
  const orderedIds = visibleStages.flatMap((s) => records.filter((r) => r.stage_id === s.id).map((r) => r.id));

  useEffect(() => {
    if (!peekId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const i = orderedIds.indexOf(peekId);
      const next = orderedIds[i + (e.key === "ArrowDown" ? 1 : -1)];
      if (next) {
        e.preventDefault();
        setPeekId(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [peekId, orderedIds]);

  if (query.isLoading)
    return (
      <AppPage guide="pipeline" module="crm" title="Pipeline" perm="crm.pipeline">
        <Loading />
      </AppPage>
    );

  const sortVal = (r: PipelineRecord, key: string): string | number => {
    if (key === "company") return (r.leads?.company_name ?? "").toLowerCase();
    if (key === "value") return dealTotal(r as any, fx);
    if (key === "priority") return { high: 3, medium: 2, low: 1 }[r.priority] ?? 0;
    return (r as any)[key] ?? "";
  };
  const sorted = (list: PipelineRecord[]) =>
    [...list].sort((a, b) => {
      const x = sortVal(a, sort.key);
      const y = sortVal(b, sort.key);
      return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
    });
  const SortHead = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <th
      className="cursor-pointer px-2 py-1.5 text-left font-medium text-muted-foreground hover:text-foreground"
      onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}
    >
      {children} {sort.key === k ? (sort.dir === 1 ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <AppPage guide="pipeline" module="crm" title="Pipeline" perm="crm.pipeline">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border p-0.5">
          {(["board", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => changeView(v)}
              className={cn(
                "rounded px-2.5 py-1 text-[12px] capitalize",
                view === v ? "bg-subtle font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        {view === "board" && (
          <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={toggleCompact}>
            {compact ? "Comfortable cards" : "Compact cards"}
          </Button>
        )}
      </div>
      {records.length === 0 ? (
        <EmptyState title="No deals in the pipeline" hint="Records appear here once a lead is marked replied." />
      ) : view === "list" ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border">
              <tr>
                <SortHead k="company">Company</SortHead>
                <SortHead k="priority">Priority</SortHead>
                <SortHead k="value">Value</SortHead>
                <SortHead k="next_followup_date">Next follow-up</SortHead>
                <SortHead k="updated_at">Updated</SortHead>
              </tr>
            </thead>
            {visibleStages.map((stage) => {
              const inStage = sorted(records.filter((r) => r.stage_id === stage.id));
              const total = inStage.reduce((a, r) => a + dealTotal(r as any, fx), 0);
              const isClosed = closedGroups.has(stage.id);
              return (
                <tbody key={stage.id}>
                  <tr
                    className="cursor-pointer bg-subtle/40"
                    onClick={() =>
                      setClosedGroups((p) => {
                        const n = new Set(p);
                        n.has(stage.id) ? n.delete(stage.id) : n.add(stage.id);
                        return n;
                      })
                    }
                  >
                    <td colSpan={5} className="px-2 py-1.5">
                      <span className="flex items-center gap-2">
                        {isClosed ? "▸" : "▾"} <Pill color={stage.color}>{stage.name}</Pill>
                        <span className="text-[12px] text-muted-foreground">
                          {inStage.length} · {fx.fmt(total)}
                        </span>
                      </span>
                    </td>
                  </tr>
                  {!isClosed &&
                    inStage.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setPeekId(r.id)}
                        className={cn("cursor-pointer border-t border-border hover:bg-subtle", peekId === r.id && "bg-subtle")}
                      >
                        <td className="px-2 py-1.5 font-medium">{r.leads?.company_name}</td>
                        <td className="px-2 py-1.5 capitalize">
                          <span className="flex items-center gap-1.5">
                            <Dot color={PRIORITY_COLORS[r.priority]} /> {r.priority}
                          </span>
                        </td>
                        <td className="tabular px-2 py-1.5">{dealValueLabel(r)}</td>
                        <td className="px-2 py-1.5">{fmtDate((r as any).next_followup_date) || "—"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{fmtDate(r.updated_at)}</td>
                      </tr>
                    ))}
                </tbody>
              );
            })}
          </table>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-3 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
          {visibleStages.map((stage) => {
              const inStage = records.filter((r) => r.stage_id === stage.id);
              const total = inStage.reduce((a, r) => a + dealTotal(r as any, fx), 0);
              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverStage(stage.id);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStage(null);
                  }}
                  onDrop={() => {
                    setOverStage(null);
                    dropOn(stage.id);
                  }}
                  className={cn(
                    "group flex min-w-[190px] flex-1 basis-0 flex-col rounded-xl border p-2 transition-colors",
                    overStage === stage.id ? "border-ring bg-subtle" : "border-border/60 bg-subtle/40",
                  )}
                >
                  <div className="px-0.5 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Pill color={stage.color}>{stage.name}</Pill>
                      <span className="flex items-center gap-1.5">
                        <span className="rounded-full border border-border bg-surface px-1.5 font-mono text-[10.5px] font-semibold text-muted-foreground">
                          {inStage.length}
                        </span>
                        <button
                          type="button"
                          title={`Hide ${stage.name}`}
                          aria-label={`Hide ${stage.name}`}
                          onClick={() => toggleHidden(stage.id)}
                          className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-subtle hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <EyeOff className="size-3.5" />
                        </button>
                      </span>
                    </div>
                    <div className="tabular mt-1 text-[12px] font-semibold text-muted-foreground">{fx.fmt(total)}</div>
                  </div>
                  <div className={cn("flex min-h-[80px] flex-col", compact ? "gap-1" : "gap-2")}>
                    {inStage.map((r) => (
                      <div
                        key={r.id}
                        draggable
                        onDragStart={() => setDragId(r.id)}
                        onDragEnd={() => setOverStage(null)}
                        onClick={() => setPeekId(r.id)}
                        onDoubleClick={() => navigate({ to: "/crm/records/$id", params: { id: r.id } })}
                        className={cn(
                          "pro-card pressable cursor-grab text-left hover:border-foreground/20 active:cursor-grabbing",
                          compact ? "flex items-center justify-between gap-2 px-2.5 py-1.5" : "space-y-2 p-3",
                          peekId === r.id && "border-ring",
                        )}
                      >
                        <div className={cn("truncate font-semibold tracking-tight text-foreground", compact ? "text-[12.5px]" : "text-[13px]")}>
                          {r.leads?.company_name}
                        </div>
                        {compact ? (
                          <span className="tabular shrink-0 text-[12px] text-muted-foreground">{dealValueLabel(r)}</span>
                        ) : (
                          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                            <span className="flex items-center gap-1.5 capitalize">
                              <Dot color={PRIORITY_COLORS[r.priority]} /> {r.priority}
                            </span>
                            <span className="tabular text-[13px] font-semibold text-foreground">{dealValueLabel(r)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          {(stages ?? []).some((s) => hidden.has(s.id)) && (
            <div className="w-[170px] shrink-0 self-start rounded-lg border border-dashed border-border p-2">
              <div className="px-1 pb-1.5 text-[11px] font-medium text-muted-foreground">Hidden stages</div>
              <div className="flex flex-col gap-1">
                {(stages ?? [])
                  .filter((s) => hidden.has(s.id))
                  .map((s) => {
                    const count = records.filter((r) => r.stage_id === s.id).length;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        title={`Show ${s.name}`}
                        onClick={() => toggleHidden(s.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => dropOn(s.id)}
                        className="group/row flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left hover:bg-subtle"
                      >
                        <Pill color={s.color}>{s.name}</Pill>
                        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          {count}
                          <Eye className="size-3.5 opacity-0 transition-opacity group-hover/row:opacity-100" />
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      <DealPeek
        recordId={peekId}
        stages={stages ?? []}
        onClose={() => setPeekId(null)}
        onStageChange={applyStage}
        onPatch={(recordId, patch) => move.mutate({ recordId, patch })}
      />

      <Dialog open={!!wonDialog} onOpenChange={(o) => !o && setWonDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm won deal</DialogTitle>
          </DialogHeader>
          <div>
            <div className="label-text mb-1">Final value</div>
            <Input
              type="number"
              className="h-8 text-[13px]"
              value={wonDialog?.value ?? ""}
              onChange={(e) => setWonDialog((d) => d && { ...d, value: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!wonDialog) return;
                const stage = (stages ?? []).find((s) => s.id === wonDialog.stageId);
                move.mutate({
                  recordId: wonDialog.recordId,
                  patch: {
                    stage_id: wonDialog.stageId,
                    probability: stage?.default_probability ?? 100,
                    closed_at: new Date().toISOString(),
                    estimated_value: wonDialog.value ? Number(wonDialog.value) : null,
                  },
                });
                setWonDialog(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lostDialog} onOpenChange={(o) => !o && setLostDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reason for loss</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="One line reason"
            className="h-8 text-[13px]"
            value={lostDialog?.reason ?? ""}
            onChange={(e) => setLostDialog((d) => d && { ...d, reason: e.target.value })}
          />
          <DialogFooter>
            <Button
              onClick={() => {
                if (!lostDialog) return;
                const stage = (stages ?? []).find((s) => s.id === lostDialog.stageId);
                const notes = [
                  records.find((r) => r.id === lostDialog.recordId)?.notes,
                  lostDialog.reason ? `Lost: ${lostDialog.reason}` : null,
                ]
                  .filter(Boolean)
                  .join("\n");
                move.mutate({
                  recordId: lostDialog.recordId,
                  patch: { stage_id: lostDialog.stageId, probability: stage?.default_probability ?? 0, notes, closed_at: new Date().toISOString() },
                });
                setLostDialog(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}
