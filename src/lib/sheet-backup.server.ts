// Server-only Google Sheet backup engine, shared by the Settings buttons and the hourly job.
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
export const BACKUP_KEY = "google_sheet_backup";
const TAB = "Leads";

export type BackupConfig = {
  spreadsheetId?: string | null;
  spreadsheetUrl?: string | null;
  lastSyncedAt?: string | null;
  lastRowCount?: number;
  enabled?: boolean;
  interval?: "1h" | "daily";
  lastRunAt?: string | null;
  lastStatus?: "ok" | "error" | null;
  lastError?: string | null;
  disconnected?: boolean;
};

export function googleConnected() {
  return Boolean(process.env["LOVABLE_API_KEY"] && process.env["GOOGLE_SHEETS_API_KEY"]);
}

function gatewayHeaders() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovableKey || !connectionKey) throw new Error("Google is not connected to this app yet.");
  return { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connectionKey, "Content-Type": "application/json" };
}

export async function gateway(path: string, init?: { method?: string; body?: unknown }) {
  const res = await fetch(`${GATEWAY}${path}`, {
    method: init?.method ?? "GET",
    headers: gatewayHeaders(),
    ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Google Sheets request failed [${res.status}]: ${text}`);
    throw new Error(`Google Sheets request failed [${res.status}]: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function readConfig(workspaceId: string): Promise<BackupConfig> {
  const sb = await admin();
  const { data } = await sb.from("app_settings").select("value").eq("key", BACKUP_KEY).eq("workspace_id" as never, workspaceId as never).maybeSingle();
  return (((data as { value?: unknown } | null)?.value as BackupConfig | undefined) ?? {});
}

export async function writeConfig(workspaceId: string, patch: Partial<BackupConfig>) {
  const sb = await admin();
  const next = { ...(await readConfig(workspaceId)), ...patch };
  const { error } = await sb.from("app_settings").upsert({ key: BACKUP_KEY, value: next, workspace_id: workspaceId } as never, { onConflict: "workspace_id,key" });
  if (error) throw new Error(error.message);
  return next;
}

export async function workspaceOf(userId: string): Promise<string> {
  const sb = await admin();
  const { data } = await sb.from("profiles").select("current_workspace_id").eq("id", userId).maybeSingle();
  const id = (data as { current_workspace_id?: string | null } | null)?.current_workspace_id;
  if (!id) throw new Error("No workspace selected.");
  return id;
}

const HEADERS = [
  "Lead code",
  "Company",
  "Primary contact",
  "Country",
  "Stage",
  "Status",
  "Priority",
  "Channel",
  "Sender account",
  "Date added",
  "Website",
  "Company LinkedIn",
  "Instagram",
  "YouTube",
  "Email sent",
  "Email sent at",
  "Email viewed",
  "Email replied",
  "Reply sentiment",
  "Reply channel",
  "LinkedIn connection sent",
  "LinkedIn message sent",
  "LinkedIn replied",
  "Instagram sent",
  "Instagram replied",
  "Loom URL",
  "Loom sent",
  "Loom watched",
  "Loom watch %",
  "Meeting booked",
  "Client closed",
  "Last contacted",
  "Next follow-up",
  "Pushed to CRM",
  "Archived",
  "Research notes",
  "Additional notes",
  "Created at",
  "Updated at",
];

type Row = Record<string, unknown>;

function yn(v: unknown) {
  return v === true ? "Yes" : v === false ? "No" : "";
}
function day(v: unknown) {
  if (!v) return "";
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
}
function name(v: unknown) {
  if (v && typeof v === "object" && "name" in (v as Row)) return String((v as Row)["name"] ?? "");
  return "";
}
function s(v: unknown) {
  return v === null || v === undefined ? "" : String(v);
}

function toRow(l: Row): string[] {
  return [
    s(l["lead_code"]),
    s(l["company_name"]),
    s(l["primary_contact"]),
    name(l["countries"]),
    name(l["stages"]),
    s(l["status"]),
    s(l["priority"]),
    name(l["channel"]),
    name(l["sender_accounts"]) || s((l["sender_accounts"] as Row | null)?.["label"]),
    day(l["date_added"]),
    s(l["website_url"]),
    s(l["company_linkedin_url"]),
    s(l["instagram_url"]),
    s(l["youtube_url"]),
    yn(l["email_sent"]),
    day(l["email_sent_at"]),
    yn(l["email_viewed"]),
    yn(l["email_replied"]),
    s(l["reply_sentiment"]),
    name(l["reply_channel"]),
    yn(l["linkedin_connection_sent"]),
    yn(l["linkedin_sent"]),
    yn(l["linkedin_replied"]),
    yn(l["instagram_sent"]),
    yn(l["instagram_replied"]),
    s(l["loom_url"]),
    yn(l["loom_sent"]),
    yn(l["loom_watched"]),
    s(l["loom_watch_percent"]),
    yn(l["meeting_booked"]),
    yn(l["client_closed"]),
    day(l["last_contacted_at"]),
    day(l["next_followup_date"]),
    yn(l["pushed_to_crm"]),
    yn(l["archived"]),
    s(l["research_notes"]),
    s(l["additional_notes"]),
    day(l["created_at"]),
    day(l["updated_at"]),
  ];
}

const SELECT = `*, countries(name), stages(name), channel:channels!leads_channel_id_fkey(name), reply_channel:channels!leads_reply_channel_id_fkey(name), sender_accounts(label)`;


/** Copies every lead of the workspace into the one backup sheet (creates it the first time). */
export async function pushWorkspace(workspaceId: string, opts: { auto?: boolean } = {}): Promise<BackupConfig> {
  const now = new Date().toISOString();
  try {
    const cfg = await readConfig(workspaceId);
    if (cfg.disconnected) throw new Error("Google Sheet is disconnected. Press Connect Google first.");
    const sb = await admin();
    const { data, error } = await sb.from("leads").select(SELECT).eq("workspace_id" as never, workspaceId as never).order("date_added", { ascending: false });
    if (error) throw new Error(error.message);
    const leads = (data ?? []) as unknown as Row[];
    let id = cfg.spreadsheetId ?? null;
    let url = cfg.spreadsheetUrl ?? null;
    if (!id) {
      const created = await gateway("/spreadsheets", { method: "POST", body: { properties: { title: "Buzzspear Tracker - Leads backup" }, sheets: [{ properties: { title: TAB } }] } });
      id = String(created["spreadsheetId"]);
      url = String(created["spreadsheetUrl"] ?? `https://docs.google.com/spreadsheets/d/${id}/edit`);
    }
    await gateway(`/spreadsheets/${id}/values/${TAB}!A:BZ:clear`, { method: "POST", body: {} });
    await gateway(`/spreadsheets/${id}/values/${TAB}!A1?valueInputOption=RAW`, { method: "PUT", body: { range: `${TAB}!A1`, majorDimension: "ROWS", values: [HEADERS, ...leads.map(toRow)] } });
    return await writeConfig(workspaceId, { spreadsheetId: id, spreadsheetUrl: url, lastSyncedAt: now, lastRowCount: leads.length, lastStatus: "ok", lastError: null, ...(opts.auto ? { lastRunAt: now } : {}) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Backup failed";
    await writeConfig(workspaceId, { lastStatus: "error", lastError: msg, ...(opts.auto ? { lastRunAt: now } : {}) }).catch(() => {});
    throw e;
  }
}

// Columns that Pull copies back from the sheet into the app (text fields only; never deletes).
const PULL_FIELDS: Record<string, string> = {
  "Primary contact": "primary_contact",
  Priority: "priority",
  Website: "website_url",
  "Company LinkedIn": "company_linkedin_url",
  Instagram: "instagram_url",
  YouTube: "youtube_url",
  "Loom URL": "loom_url",
  "Research notes": "research_notes",
  "Additional notes": "additional_notes",
};

/** Reads the backup sheet and applies edits back to the app: updates by lead code, adds new companies. */
export async function pullWorkspace(workspaceId: string): Promise<{ inserted: number; updated: number }> {
  const cfg = await readConfig(workspaceId);
  if (!cfg.spreadsheetId) throw new Error("No backup sheet yet. Press Push or Back up now first.");
  const res = await gateway(`/spreadsheets/${cfg.spreadsheetId}/values/${TAB}!A1:BZ`);
  const rows = (res["values"] as string[][] | undefined) ?? [];
  if (rows.length < 2) return { inserted: 0, updated: 0 };
  const head = rows[0]!;
  const idx = (h: string) => head.indexOf(h);
  const sb = await admin();
  const { data: existing } = await sb.from("leads").select("*").eq("workspace_id" as never, workspaceId as never);
  const byCode = new Map<string, Row>();
  const byName = new Map<string, Row>();
  for (const l of (existing ?? []) as Row[]) {
    if (l["lead_code"]) byCode.set(String(l["lead_code"]), l);
    if (l["company_name"]) byName.set(String(l["company_name"]).trim().toLowerCase(), l);
  }
  let inserted = 0;
  let updated = 0;
  for (const r of rows.slice(1)) {
    const cell = (h: string) => { const i = idx(h); return i < 0 ? "" : String(r[i] ?? "").trim(); };
    const company = cell("Company");
    if (!company) continue;
    const match = byCode.get(cell("Lead code")) ?? byName.get(company.toLowerCase());
    const patch: Row = {};
    for (const [h, col] of Object.entries(PULL_FIELDS)) {
      if (idx(h) < 0) continue;
      const v = cell(h);
      if (match ? s(match[col]) !== v : v) patch[col] = v || null;
    }
    if (match) {
      if (s(match["company_name"]) !== company) patch["company_name"] = company;
      if (!Object.keys(patch).length) continue;
      const { error } = await sb.from("leads").update(patch as never).eq("id", String(match["id"]));
      if (!error) updated++;
    } else {
      const { error } = await sb.from("leads").insert({ ...patch, company_name: company, workspace_id: workspaceId } as never);
      if (!error) inserted++;
    }
  }
  return { inserted, updated };
}
