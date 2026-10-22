// Ported from live chunk crm.records.index-C9212tLO.js.
import { openRecordPeek } from "@/lib/peek";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppPage } from "@/components/app-shell";
import { Card, Dot, EmptyState, Loading, Pill, fmtDate, money } from "@/components/live/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useChannels, useCountries, useProfiles, useSenderAccounts, useStages, useTags } from "@/hooks/useLookups";
import { CollapsibleCard } from "@/components/kit";
import { useStoredState } from "@/components/crm/filters";
import {
  DEAL_TYPE_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  senderLabel,
  type CrmRecordRow,
} from "@/components/crm/helpers";

export const Route = createFileRoute("/crm/records/")({
  head: () => ({
    meta: [
      { title: "Records | CRM | Tracker | Buzzspear" },
      { name: "description", content: "All CRM deal records with stage, value and owner." },
      { property: "og:title", content: "Records | CRM | Tracker | Buzzspear" },
      { property: "og:description", content: "All CRM deal records with stage, value and owner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecordsPage,
});

type View = "table" | "columns" | "cards";
type SortField =
  | "company"
  | "contact"
  | "stage"
  | "priority"
  | "estimated_value"
  | "deal_type"
  | "expected_close_date"
  | "last_contacted_at"
  | "next_followup_date"
  | "owner";

type RecordRow = CrmRecordRow & {
  leads: (NonNullable<CrmRecordRow["leads"]> & { reply_sentiment?: string | null }) | null;
};

const PAGE_SIZE = 50;
const VIEW_KEY = "tracker.crm.records.view";

const SORT_COLUMNS: Record<SortField, { column: string; foreignTable?: string }> = {
  company: { column: "company_name", foreignTable: "leads" },
  contact: { column: "primary_contact", foreignTable: "leads" },
  stage: { column: "stage_id" },
  priority: { column: "priority" },
  estimated_value: { column: "estimated_value" },
  deal_type: { column: "deal_type" },
  expected_close_date: { column: "expected_close_date" },
  last_contacted_at: { column: "last_contacted_at" },
  next_followup_date: { column: "next_followup_date" },
  owner: { column: "owner_id" },
};

const VIEWS: { key: View; icon: ComponentType<{ className?: string }> }[] = [
  { key: "table", icon: Table2 },
  { key: "columns", icon: Columns3 },
  { key: "cards", icon: LayoutGrid },
];

function RecordsPage() {
  const navigate = useNavigate();
  const { data: stages } = useStages("crm");
  const { data: profiles } = useProfiles();
  const [view, setView] = useState<View>("table");
  useEffect(() => {
    const v = window.localStorage.getItem(VIEW_KEY);
    if (v === "table" || v === "columns" || v === "cards") setView(v);
  }, []);
  const changeView = (v: View) => {
    setView(v);
    window.localStorage.setItem(VIEW_KEY, v);
  };

  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>("next_followup_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const EMPTY = { search: "", stage: "all", priority: "all", owner: "all", dealType: "all", closeMonth: "", minValue: "", maxValue: "", country: "all", channel: "all", sender: "all", tag: "all", dateFrom: "", dateTo: "", replied: "all", loom: "all" };
  const [f, setF] = useStoredState("tracker.crm.records.filters", EMPTY);
  const flt = { ...EMPTY, ...f };
  const { stage, priority, owner, dealType, closeMonth, minValue, maxValue } = flt;
  const set = (k: keyof typeof EMPTY) => (v: string) => setF({ ...flt, [k]: v });
  const setStage = set("stage"), setPriority = set("priority"), setOwner = set("owner"), setDealType = set("dealType");
  const setCloseMonth = set("closeMonth"), setMinValue = set("minValue"), setMaxValue = set("maxValue");
  const { data: countries } = useCountries();
  const { data: channels } = useChannels();
  const { data: senders } = useSenderAccounts();
  const { data: tags } = useTags();
  useEffect(() => {
    setPage(0);
  }, [JSON.stringify(flt)]);

  const stageById = useMemo(() => new Map((stages ?? []).map((s) => [s.id, s])), [stages]);
  const profileById = useMemo(() => new Map((profiles ?? []).map((p) => [p.id, p])), [profiles]);

  const applyFilters = (q: any) => {
    if (stage !== "all") q = q.eq("stage_id", stage);
    if (priority !== "all") q = q.eq("priority", priority);
    if (owner !== "all") q = q.eq("owner_id", owner);
    if (dealType !== "all") q = q.eq("deal_type", dealType);
    if (closeMonth) {
      const [y, m] = closeMonth.split("-").map(Number);
      const from = new Date(y, m - 1, 1).toISOString().slice(0, 10);
      const to = new Date(y, m, 0).toISOString().slice(0, 10);
      q = q.gte("expected_close_date", from).lte("expected_close_date", to);
    }
    if (minValue) q = q.gte("estimated_value", Number(minValue));
    if (maxValue) q = q.lte("estimated_value", Number(maxValue));
    const term = flt.search.trim().replace(/[,()%]/g, " ");
    if (term) q = q.or(`company_name.ilike.%${term}%,primary_contact.ilike.%${term}%,lead_code.ilike.%${term}%`, { foreignTable: "leads" });
    if (flt.country !== "all") q = q.eq("leads.country_id", flt.country);
    if (flt.channel !== "all") q = q.eq("leads.channel_id", flt.channel);
    if (flt.sender !== "all") q = q.eq("leads.sender_account_id", flt.sender);
    if (flt.dateFrom) q = q.gte("leads.date_added", flt.dateFrom);
    if (flt.dateTo) q = q.lte("leads.date_added", flt.dateTo);
    if (flt.loom !== "all") q = q.eq("leads.loom_sent", flt.loom === "yes");
    if (flt.replied === "yes") q = q.or("email_replied.eq.true,linkedin_replied.eq.true,instagram_replied.eq.true", { foreignTable: "leads" });
    if (flt.replied === "no") q = q.eq("leads.email_replied", false).eq("leads.linkedin_replied", false).eq("leads.instagram_replied", false);
    return q;
  };

  const isColumns = view === "columns";
  const { data, isLoading } = useQuery({
    queryKey: ["crm_records", view, page, sortField, sortDir, JSON.stringify(flt)],
    queryFn: async () => {
      let q = (supabase as any)
        .from("crm_records")
        .select(
          "*, leads!inner(id,company_name,lead_code,primary_contact,reply_sentiment,sender_account_id,contacted_channel_id,sender_accounts(label,identifier),channels:channels!leads_contacted_channel_id_fkey(name),lead_contacts(email,linkedin_url,is_primary))",
          { count: "exact" },
        );
      q = applyFilters(q);
      if (flt.tag !== "all") {
        const { data: lt } = await (supabase as any).from("lead_tags").select("lead_id").eq("tag_id", flt.tag);
        q = q.in("lead_id", (lt ?? []).map((x: any) => x.lead_id).concat("00000000-0000-0000-0000-000000000000"));
      }
      const sort = SORT_COLUMNS[sortField];
      q = q.order(sort.column, { ascending: sortDir === "asc", foreignTable: sort.foreignTable });
      q = isColumns ? q.limit(1000) : q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as RecordRow[], count: (count ?? 0) as number };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const primaryEmail = (r: RecordRow) => {
    const contacts = r.leads?.lead_contacts ?? [];
    return (contacts.find((c) => c.is_primary) ?? contacts[0])?.email ?? "";
  };
  const ownerName = (id: string | null) => {
    if (!id) return "";
    const p = profileById.get(id);
    return p?.full_name || p?.email || "";
  };
  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(f);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortField }) => (
    <button type="button" onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-foreground">
      {label}
      {sortField === field ? (
        sortDir === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-30" />
      )}
    </button>
  );

  const open = (id: string) => openRecordPeek(id);
  void navigate;

  const tableRow = (r: RecordRow) => {
    const s = r.stage_id ? stageById.get(r.stage_id) : undefined;
    return (
      <tr
        key={r.id}
        onClick={() => open(r.id)}
        className="h-9 cursor-pointer border-b border-border text-[13px] hover:bg-subtle"
      >
        <td className="px-3 whitespace-nowrap">{r.leads?.company_name}</td>
        <td className="px-3 whitespace-nowrap">{r.leads?.primary_contact}</td>
        <td className="px-3">{primaryEmail(r)}</td>
        <td className="px-3 text-[12px] text-muted-foreground">{senderLabel(r)}</td>
        <td className="px-3 text-[12px] capitalize">{r.leads?.reply_sentiment ?? "-"}</td>
        <td className="px-3">
          <Pill color={s?.color}>{s?.name ?? "-"}</Pill>
        </td>
        <td className="px-3">
          <span className="flex items-center gap-1.5">
            <Dot color={PRIORITY_COLORS[r.priority]} />
            {PRIORITY_LABELS[r.priority] ?? r.priority}
          </span>
        </td>
        <td className="px-3">{money(r.estimated_value, r.currency)}</td>
        <td className="px-3">{s?.is_won ? (DEAL_TYPE_LABELS[r.deal_type] ?? r.deal_type) : "-"}</td>
        <td className="px-3">{fmtDate(r.expected_close_date)}</td>
        <td className="px-3">{fmtDate(r.last_contacted_at)}</td>
        <td className="px-3">{fmtDate(r.next_followup_date)}</td>
        <td className="px-3">{ownerName(r.owner_id)}</td>
      </tr>
    );
  };

  const recordCard = (r: RecordRow) => {
    const s = r.stage_id ? stageById.get(r.stage_id) : undefined;
    return (
      <button key={r.id} onClick={() => open(r.id)} className="w-full pro-card p-3 text-left hover:bg-subtle">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[13px] font-medium">{r.leads?.company_name}</div>
          <Pill color={s?.color}>{s?.name ?? "-"}</Pill>
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground">{r.leads?.primary_contact}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">Sent via {senderLabel(r)}</div>
        <div className="mt-2 flex items-center justify-between text-[12px]">
          <span className="flex items-center gap-1.5">
            <Dot color={PRIORITY_COLORS[r.priority]} />
            {PRIORITY_LABELS[r.priority]}
          </span>
          <span>{money(r.estimated_value, r.currency)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Next: {fmtDate(r.next_followup_date) || "-"}</span>
          <span>{ownerName(r.owner_id)}</span>
        </div>
      </button>
    );
  };

  const pick = (label: string, k: keyof typeof EMPTY, opts: { id: string; name: string }[]) => (
    <div className="flex flex-col gap-1">
      <span className="label-text">{label}</span>
      <Select value={flt[k]} onValueChange={set(k)}>
        <SelectTrigger className="h-8 w-[150px] text-[12px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {opts.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
  const yesNo = [{ id: "yes", name: "Yes" }, { id: "no", name: "No" }];
  const filterBar = (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <span className="label-text">Search</span>
        <Input className="h-8 w-[220px] text-[12px]" placeholder="Company, contact, code" value={flt.search} onChange={(e) => setF({ ...flt, search: e.target.value })} />
      </div>
      {pick("Country", "country", (countries ?? []).map((c: any) => ({ id: c.id, name: c.name })))}
      {pick("Channel", "channel", (channels ?? []).map((c: any) => ({ id: c.id, name: c.name })))}
      {pick("Sender account", "sender", (senders ?? []).map((c: any) => ({ id: c.id, name: c.label })))}
      {pick("Tag", "tag", (tags ?? []).map((c: any) => ({ id: c.id, name: c.name })))}
      {pick("Has replied", "replied", yesNo)}
      {pick("Loom sent", "loom", yesNo)}
      <div className="flex flex-col gap-1">
        <span className="label-text">Date added</span>
        <div className="flex items-center gap-1">
          <Input type="date" className="h-8 w-[135px] text-[12px]" value={flt.dateFrom} onChange={(e) => setF({ ...flt, dateFrom: e.target.value })} />
          <span className="text-muted-foreground">–</span>
          <Input type="date" className="h-8 w-[135px] text-[12px]" value={flt.dateTo} onChange={(e) => setF({ ...flt, dateTo: e.target.value })} />
        </div>
      </div>
      <Select value={stage} onValueChange={setStage}>
        <SelectTrigger className="h-8 w-[140px] text-[12px]">
          <SelectValue placeholder="Stage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stages</SelectItem>
          {(stages ?? []).map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={priority} onValueChange={setPriority}>
        <SelectTrigger className="h-8 w-[120px] text-[12px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
      <Select value={owner} onValueChange={setOwner}>
        <SelectTrigger className="h-8 w-[140px] text-[12px]">
          <SelectValue placeholder="Owner" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All owners</SelectItem>
          {(profiles ?? []).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.full_name || p.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={dealType} onValueChange={setDealType}>
        <SelectTrigger className="h-8 w-[130px] text-[12px]">
          <SelectValue placeholder="Deal type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All deal types</SelectItem>
          <SelectItem value="one_time">One time</SelectItem>
          <SelectItem value="retainer">MRR</SelectItem>
          <SelectItem value="hybrid">Hybrid</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="month"
        value={closeMonth}
        onChange={(e) => setCloseMonth(e.target.value)}
        className="h-8 w-[150px] text-[12px]"
      />
      <Input
        type="number"
        placeholder="Min value"
        value={minValue}
        onChange={(e) => setMinValue(e.target.value)}
        className="h-8 w-[110px] text-[12px]"
      />
      <Input
        type="number"
        placeholder="Max value"
        value={maxValue}
        onChange={(e) => setMaxValue(e.target.value)}
        className="h-8 w-[110px] text-[12px]"
      />
      <button className="label-text underline" onClick={() => setF({ ...EMPTY })}>Clear all</button>
    </div>
  );

  const viewSwitch = (
    <div className="flex items-center gap-0.5 rounded-lg border border-border/80 p-0.5">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          onClick={() => changeView(v.key)}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-[12px]",
            view === v.key ? "bg-subtle text-foreground" : "text-muted-foreground",
          )}
        >
          <v.icon className="size-3.5" />
        </button>
      ))}
    </div>
  );

  return (
    <AppPage guide="crm-records" module="crm" title="Records" perm="crm.records" actions={viewSwitch}>
      <div className="flex flex-col gap-4">
        <CollapsibleCard id="crm.records.filters" title="Filters" defaultOpen={false}>{filterBar}</CollapsibleCard>
        {isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState title="No CRM records" hint="Records appear here once a lead is marked replied." />
        ) : view === "table" ? (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead className="sticky top-0 bg-card text-left text-[11px] text-muted-foreground">
                <tr className="h-9 border-b border-border">
                  <th className="px-3 font-medium">
                    <SortHeader label="Company" field="company" />
                  </th>
                  <th className="px-3 font-medium">
                    <SortHeader label="Contact" field="contact" />
                  </th>
                  <th className="px-3 font-medium">Email</th>
                  <th className="px-3 font-medium">Sent via</th>
                  <th className="px-3 font-medium">Sentiment</th>
                  <th className="px-3 font-medium">
                    <SortHeader label="Stage" field="stage" />
                  </th>
                  <th className="px-3 font-medium">
                    <SortHeader label="Priority" field="priority" />
                  </th>
                  <th className="px-3 font-medium">
                    <SortHeader label="Value" field="estimated_value" />
                  </th>
                  <th className="px-3 font-medium">
                    <SortHeader label="Deal type" field="deal_type" />
                  </th>
                  <th className="px-3 font-medium">
                    <SortHeader label="Expected close" field="expected_close_date" />
                  </th>
                  <th className="px-3 font-medium">
                    <SortHeader label="Last contacted" field="last_contacted_at" />
                  </th>
                  <th className="px-3 font-medium">
                    <SortHeader label="Next follow-up" field="next_followup_date" />
                  </th>
                  <th className="px-3 font-medium">
                    <SortHeader label="Owner" field="owner" />
                  </th>
                </tr>
              </thead>
              <tbody>{rows.map(tableRow)}</tbody>
            </table>
          </Card>
        ) : view === "cards" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map(recordCard)}</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {(stages ?? []).map((s) => {
              const inStage = rows.filter((r) => r.stage_id === s.id);
              return (
                <div key={s.id} className="w-[280px] shrink-0 pro-card">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <Pill color={s.color}>{s.name}</Pill>
                    <span className="text-[11px] text-muted-foreground">{inStage.length}</span>
                  </div>
                  <div className="flex flex-col gap-2 p-2">
                    {inStage.length === 0 ? (
                      <div className="p-3 text-center text-[12px] text-muted-foreground">Empty</div>
                    ) : (
                      inStage.map(recordCard)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!isColumns && rows.length > 0 && (
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <span>
              Page {page + 1} of {pages} ({total} records)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppPage>
  );
}
