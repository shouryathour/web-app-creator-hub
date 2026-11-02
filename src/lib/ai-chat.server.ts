// Server-only: tools and pricing for the "Ask AI" tracker chat.
// Every tool runs with the caller's own database client, so RLS/workspace rules apply.
import { tool } from "ai";
import { z } from "zod";
import type { AnyClient } from "@/lib/live/server-ctx";
import { ACTIVITY_FLAGS } from "@/lib/activity-rates";

export const AI_MODELS = {
  "claude-haiku-5-5": { label: "Haiku 5.5", inPerM: 1, outPerM: 5 },
  "claude-sonnet-5-5": { label: "Sonnet 5.5", inPerM: 3, outPerM: 15 },
} as const;
export type AiModelId = keyof typeof AI_MODELS;

export function costUsd(model: AiModelId, input: number, output: number) {
  const p = AI_MODELS[model];
  return (input * p.inPerM + output * p.outPerM) / 1_000_000;
}

const LEAD_FIELDS =
  "id,lead_code,company_name,primary_contact,date_added,archived,pushed_to_crm,priority,reply_sentiment,website_url,sample_url,content_audit_url,loom_url,loom_watch_percent,next_followup_date,last_contacted_at,research_notes,stage_id,channel_id,sender_account_id,country_id," +
  ACTIVITY_FLAGS.flatMap((f) => [f, `${f}_at`]).join(",");

async function allLeads(sb: AnyClient, includeArchived: boolean) {
  const out: Record<string, any>[] = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from("leads").select(LEAD_FIELDS).order("date_added").range(from, from + 999);
    if (!includeArchived) q = q.eq("archived", false);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function lookups(sb: AnyClient) {
  const [st, ch, sa, co] = await Promise.all([
    sb.from("stages").select("id,name,board,is_won,is_lost"),
    sb.from("channels").select("id,name,kind"),
    sb.from("sender_accounts").select("id,label,identifier"),
    sb.from("countries").select("id,name"),
  ]);
  const m = (rows: any[] | null, key = "name") => new Map((rows ?? []).map((r) => [r.id, r[key]]));
  return { stage: m(st.data), channel: m(ch.data), sender: m(sa.data, "label"), country: m(co.data), raw: { stages: st.data, channels: ch.data, senders: sa.data, countries: co.data } };
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);

export function buildTools(sb: AnyClient) {
  return {
    activity_stats: tool({
      description:
        "Exact outreach counts for a date range, based on WHEN each action happened (its timestamp), not when the lead was added. Use for questions like 'how many emails were sent last week', reply/view rates, Loom watch rate, meetings, clients closed, leads added, samples. Dates are YYYY-MM-DD, inclusive.",
      inputSchema: z.object({
        from: z.string().describe("Start date YYYY-MM-DD"),
        to: z.string().describe("End date YYYY-MM-DD"),
        include_archived: z.boolean().describe("Include archived leads (normally false)"),
      }),
      execute: async ({ from, to, include_archived }) => {
        const leads = await allLeads(sb, include_archived);
        const lo = new Date(`${from}T00:00:00`).getTime();
        const hi = new Date(`${to}T23:59:59.999`).getTime();
        const inR = (v: string | null) => {
          if (!v) return false;
          const t = new Date(v).getTime();
          return t >= lo && t <= hi;
        };
        const counts: Record<string, number> = {};
        for (const f of ACTIVITY_FLAGS) counts[f] = leads.filter((l) => l[f] && inR(l[`${f}_at`])).length;
        const added = leads.filter((l) => l.date_added >= from && l.date_added <= to);
        const repliedPositive = leads.filter((l) => l.email_replied && inR(l.email_replied_at) && l.reply_sentiment === "positive").length;
        return {
          range: { from, to },
          counts,
          leads_added: added.length,
          samples_on_leads_added_in_range: added.filter((l) => l.sample_url).length,
          content_audits_on_leads_added_in_range: added.filter((l) => l.content_audit_url).length,
          positive_email_replies: repliedPositive,
          rates_percent: {
            email_view_rate: pct(counts.email_viewed, counts.email_sent),
            email_reply_rate: pct(counts.email_replied, counts.email_sent),
            linkedin_reply_rate: pct(counts.linkedin_replied, counts.linkedin_sent),
            instagram_reply_rate: pct(counts.instagram_replied, counts.instagram_sent),
            loom_watch_rate: pct(counts.loom_watched, counts.loom_sent),
          },
          note: "Samples/content audits have no 'sent' date, so they are counted on leads added in the range. Rates divide actions in the range by sends in the same range.",
        };
      },
    }),
    search_leads: tool({
      description:
        "List leads (prospects) with their details. Filter by text (company, contact, code), stage name, channel name, whether in CRM, a done activity flag, archived, or having a sample/content-audit link. Returns up to `limit` rows plus the total match count.",
      inputSchema: z.object({
        text: z.string().nullable(),
        stage: z.string().nullable(),
        channel: z.string().nullable(),
        in_crm: z.boolean().nullable(),
        flag_done: z.string().nullable().describe(`One of: ${ACTIVITY_FLAGS.join(", ")}`),
        flag_not_done: z.string().nullable().describe("Activity flag that must NOT be done, e.g. loom_watched"),
        has_sample: z.boolean().nullable(),
        archived: z.boolean().nullable().describe("null = active only"),
        limit: z.number().nullable().describe("Default 25, max 200"),
      }),
      execute: async (a) => {
        const lk = await lookups(sb);
        let leads = await allLeads(sb, a.archived === true);
        if (a.archived === true) leads = leads.filter((l) => l.archived);
        const t = a.text?.toLowerCase().trim();
        if (t) leads = leads.filter((l) => [l.company_name, l.primary_contact, l.lead_code].some((v) => v?.toLowerCase().includes(t)));
        if (a.stage) leads = leads.filter((l) => lk.stage.get(l.stage_id)?.toLowerCase() === a.stage!.toLowerCase());
        if (a.channel) leads = leads.filter((l) => lk.channel.get(l.channel_id)?.toLowerCase() === a.channel!.toLowerCase());
        if (a.in_crm != null) leads = leads.filter((l) => !!l.pushed_to_crm === a.in_crm);
        if (a.flag_done) leads = leads.filter((l) => l[a.flag_done!]);
        if (a.flag_not_done) leads = leads.filter((l) => !l[a.flag_not_done!]);
        if (a.has_sample != null) leads = leads.filter((l) => !!l.sample_url === a.has_sample);
        const limit = Math.min(Math.max(a.limit ?? 25, 1), 200);
        return {
          total: leads.length,
          rows: leads.slice(0, limit).map((l) => {
            const done = ACTIVITY_FLAGS.filter((f) => l[f]).map((f) => `${f}${l[`${f}_at`] ? `@${String(l[`${f}_at`]).slice(0, 10)}` : ""}`);
            return {
              id: l.id, code: l.lead_code, company: l.company_name, contact: l.primary_contact, added: l.date_added,
              stage: lk.stage.get(l.stage_id) ?? null, channel: lk.channel.get(l.channel_id) ?? null,
              sender: lk.sender.get(l.sender_account_id) ?? null, country: lk.country.get(l.country_id) ?? null,
              in_crm: l.pushed_to_crm, archived: l.archived, sentiment: l.reply_sentiment, done,
              sample: l.sample_url, next_followup: l.next_followup_date,
            };
          }),
        };
      },
    }),
    get_lead: tool({
      description: "Full details of one lead: contacts, follow-ups, notes, CRM deal. Pass the lead id (from search_leads).",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const [lead, contacts, fu, crm] = await Promise.all([
          sb.from("leads").select(LEAD_FIELDS).eq("id", id).maybeSingle(),
          sb.from("lead_contacts").select("person_name,job_title,email,emails,linkedin_url,phone,is_primary").eq("lead_id", id),
          sb.from("lead_followups").select("sequence_number,scheduled_date,sent_at,status,notes").eq("lead_id", id).order("sequence_number"),
          sb.from("crm_records").select("priority,estimated_value,currency,deal_type,mrr_amount,closed_at,expected_close_date,next_followup_date,notes,stages(name)").eq("lead_id", id).maybeSingle(),
        ]);
        if (lead.error) throw new Error(lead.error.message);
        return { lead: lead.data, contacts: contacts.data, followups: fu.data, crm: crm.data };
      },
    }),
    crm_overview: tool({
      description: "CRM deals: revenue summary (pipeline, won this month, MRR), deal counts per stage, and won deals with close dates and amounts. Archived leads excluded.",
      inputSchema: z.object({}),
      execute: async () => {
        const [sum, deals] = await Promise.all([
          sb.rpc("revenue_summary"),
          sb.from("crm_records").select("estimated_value,currency,mrr_amount,usd_value_at_close,closed_at,stages(name,is_won,is_lost),leads!inner(company_name,archived)").eq("leads.archived", false),
        ]);
        if (deals.error) throw new Error(deals.error.message);
        const byStage: Record<string, number> = {};
        const won: any[] = [];
        for (const d of (deals.data ?? []) as any[]) {
          const s = d.stages?.name ?? "No stage";
          byStage[s] = (byStage[s] ?? 0) + 1;
          if (d.stages?.is_won) won.push({ company: d.leads?.company_name, closed_at: d.closed_at, value: d.estimated_value, currency: d.currency, mrr: d.mrr_amount, usd: d.usd_value_at_close });
        }
        return { summary: sum.data?.[0] ?? null, deals_total: deals.data?.length ?? 0, by_stage: byStage, won };
      },
    }),
    list_settings: tool({
      description: "Stage names, channel names, sender accounts and countries configured in the tracker.",
      inputSchema: z.object({}),
      execute: async () => (await lookups(sb)).raw,
    }),
  };
}

export function systemPrompt(model: AiModelId, today: string) {
  return `You are Buzzspear's tracker assistant. Today is ${today}. You answer questions about the team's leads (also called prospects), outreach (email, LinkedIn, Instagram, Loom), follow-ups and CRM deals.
Rules:
- Always get numbers from the tools. Never estimate or invent counts, dates or money.
- "Last week" means the previous Monday–Sunday; "this week" means Monday to today. State the exact dates you used.
- Activity questions count when the action happened, not when the lead was added.
- Be brief. Use short tables for lists. You can only read data; if asked to change something, say editing is not available yet.
${model === "claude-haiku-5-5" ? '- You are the fast model. If a question needs heavy multi-step analysis (several periods compared, many breakdowns), answer it, then add one line: "Tip: switch to Sonnet 5.5 for deeper analysis like this."' : ""}`;
}
