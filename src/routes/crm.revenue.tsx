// Ported from live chunk crm.revenue-CHeAOlG8.js.
import { useMemo, useState } from "react";
import { LEAD_INNER_EMBED, excludeArchivedLeads } from "@/lib/lead-scope";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppPage } from "@/components/app-shell";
import { Card, EmptyState, Loading, fmtDate } from "@/components/live/kit";
import { Input } from "@/components/ui/input";
import { clientsByMonth } from "@/lib/clients-closed";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/live/auth";
import { useStages } from "@/hooks/useLookups";
import { useStoredState } from "@/components/crm/filters";
import { useReportCurrency } from "@/components/crm/report-currency";
import { REVENUE_FIELDS, monthKey, type EarningsDeal } from "@/components/crm/earnings";
import { monthEarnings, monthlyClientAmount } from "@/lib/monthly-earnings";
import { EarningsChart } from "@/components/crm/revenue/EarningsChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/crm/revenue")({
  head: () => ({
    meta: [
      { title: "Revenue & clients | CRM | Buzzspear" },
      { name: "description", content: "Monthly earnings, client contributions and closed-client goals in Buzzspear." },
      { property: "og:title", content: "Revenue & clients | CRM | Buzzspear" },
      { property: "og:description", content: "Monthly earnings, client contributions and closed-client goals in Buzzspear." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RevenuePage,
});

function RevenuePage() {
  const { can } = useAuth();
  const allowed = can("crm.revenue");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [selectedIndex, setSelectedIndex] = useState(() => new Date().getMonth());
  const fx = useReportCurrency();
  const [goal, setGoal] = useStoredState("crm.clients.monthlyGoal", 4);
  const { data: stages } = useStages("crm");
  const { data: records, isLoading } = useQuery({
    queryKey: ["crm_records_revenue"],
    queryFn: async () => {
      const { data, error } = await excludeArchivedLeads(
        (supabase as any)
          .from("crm_records")
          .select(`id,lead_id,stage_id,${REVENUE_FIELDS},${LEAD_INNER_EMBED}(company_name)`),
      );
      if (error) throw error;
      return (data ?? []) as (EarningsDeal & { id: string; lead_id: string; stage_id: string | null; closed_at: string | null; leads: { company_name: string } | null })[];
    },
    enabled: allowed,
  });
  const won = useMemo(() => {
    const ids = new Set((stages ?? []).filter((s) => s.is_won).map((s) => s.id));
    return (records ?? []).filter((r) => r.stage_id && ids.has(r.stage_id));
  }, [records, stages]);
  const months = useMemo(() => clientsByMonth(won, year), [won, year]);
  const thisMonth = new Date().getMonth();
  const undated = won.filter((r) => !r.closed_at);
  const chart = MONTHS.map((label, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    const earnings = monthEarnings(won, month, fx);
    return { month, label, value: earnings.total, clients: earnings.clients.length };
  });
  const selectedMonth = `${year}-${String(selectedIndex + 1).padStart(2, "0")}`;
  const selected = monthEarnings(won, selectedMonth, fx);
  const previous = monthEarnings(won, monthKey(new Date(year, selectedIndex - 1, 1)), fx);
  const difference = selected.total - previous.total;

  if (!allowed)
    return (
      <AppPage module="crm" title="Clients closed" perm="crm.revenue">
        <EmptyState title="This page is not enabled for this account" hint="Ask an admin to give you access." />
      </AppPage>
    );

  return (
    <AppPage module="crm" title="Revenue & clients" perm="crm.revenue">
      {isLoading || !stages ? (
        <Loading />
      ) : (
        <div className="flex flex-col gap-4">
          <Card title="Earned by month" actions={
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-8 w-28" aria-label="Earnings year"><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - i).map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          }>
            <EarningsChart data={chart} currency={fx.code} onSelect={(month) => setSelectedIndex(Number(month.slice(5)) - 1)} />
          </Card>
          <Card title={`${MONTHS[selectedIndex]} ${year} · client breakdown`} actions={
            <Select value={String(selectedIndex)} onValueChange={(v) => setSelectedIndex(Number(v))}>
              <SelectTrigger className="h-8 w-28" aria-label="Breakdown month"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          }>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div><div className="label-text">Earned · {fx.code}</div><div className="text-2xl font-semibold">{fx.fmt(selected.total)}</div></div>
              <div><div className="label-text">Average per client · {selected.clients.length} clients</div><div className="text-2xl font-semibold">{fx.fmt(selected.average)}</div></div>
              <div><div className="label-text">Compared with previous month</div><div className={difference < 0 ? "text-2xl font-semibold text-negative" : "text-2xl font-semibold text-positive"}>{difference > 0 ? "+" : ""}{fx.fmt(difference)}</div></div>
            </div>
            {selected.clients.length ? <ul className="divide-y divide-border text-[13px]">{selected.clients.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <a href={`/crm/records/${r.id}`} className="min-w-0 font-medium hover:underline">{r.leads?.company_name ?? "Unnamed"}</a>
              <span className="shrink-0">{monthlyClientAmount(r, fx) ? fx.fmt(monthlyClientAmount(r, fx)) : "Amount not recorded"}</span>
            </li>)}</ul> : <EmptyState title="No clients closed this month" />}
          </Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card title="This month">
              <div className="text-3xl font-semibold">
                {year === new Date().getFullYear() ? months[thisMonth].length : "-"}
                <span className="text-base text-muted-foreground"> / {goal}</span>
              </div>
              <div className="label-text mt-1">clients closed vs. your monthly goal</div>
            </Card>
            <Card title={`Total in ${year}`}>
              <div className="text-3xl font-semibold">{months.reduce((n, m) => n + m.length, 0)}</div>
              <div className="label-text mt-1">clients closed this year</div>
            </Card>
            <Card title="Monthly goal">
              <Input
                type="number"
                min={1}
                className="h-9 w-28"
                value={goal}
                onChange={(e) => setGoal(Math.max(1, Number(e.target.value) || 1))}
              />
              <div className="label-text mt-1">clients you want to close each month</div>
            </Card>
          </div>
          <Card
            title="Clients closed by month"
            actions={
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7" onClick={() => setYear(year - 1)}>
                  {year - 1}
                </Button>
                <span className="px-2 text-[13px] font-medium">{year}</span>
                <Button variant="outline" size="sm" className="h-7" onClick={() => setYear(year + 1)}>
                  {year + 1}
                </Button>
              </div>
            }
          >
            <div className="flex flex-col gap-2">
              {months.map((m, i) => {
                const pct = Math.min(100, (m.length / Math.max(1, goal)) * 100);
                return (
                  <div key={i} className="grid grid-cols-[48px_1fr_56px] items-center gap-3 text-[13px]">
                    <div className="text-muted-foreground">{MONTHS[i]}</div>
                    <div className="h-6 overflow-hidden rounded-md bg-muted">
                      <div
                        className={m.length >= goal ? "h-full bg-positive" : "h-full bg-primary"}
                        style={{ width: `${pct}%` }}
                        title={m.map((r) => r.leads?.company_name).join(", ")}
                      />
                    </div>
                    <div className="text-right font-medium">
                      {m.length}
                      <span className="text-muted-foreground"> / {goal}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card title="Closed clients">
            {won.length === 0 ? (
              <EmptyState title="No clients closed yet" hint="Move a deal to Won and it shows up here." />
            ) : (
              <ul className="divide-y divide-border text-[13px]">
                {[...won]
                  .sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""))
                  .map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2">
                      <a href={`/crm/records/${r.id}`} className="font-medium hover:underline">
                        {r.leads?.company_name ?? "Unnamed"}
                      </a>
                      <span className="text-muted-foreground">{r.closed_at ? fmtDate(r.closed_at) : "No close date"}</span>
                    </li>
                  ))}
              </ul>
            )}
            {undated.length > 0 && (
              <div className="label-text mt-2">{undated.length} won deal(s) have no close date, so they are not counted in a month.</div>
            )}
          </Card>
        </div>
      )}
    </AppPage>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
