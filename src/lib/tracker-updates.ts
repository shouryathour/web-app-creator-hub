import type { QueryClient } from "@tanstack/react-query";

const LEAD_KEYS = [
  "leads", "leads-table", "leads-board", "lead_detail", "lead_neighbours",
  "today-leads", "rapid-today", "outreach-rate-leads", "outreach-auto",
  "dashboard", "dashboard-active-leads", "dashboard-counts", "dashboard-replies-not-in-crm",
  "ledger-counts", "ledger-leads-added", "ledger-leads-added-prev", "all-followups",
];
const CRM_KEYS = [
  "crm-records", "crm-dashboard", "crm-pipeline", "crm_records", "crm_record",
  "crm_pipeline_records", "crm_records_dashboard", "crm_records_revenue", "crm_followups",
];
const EVENT_KEYS = ["lead-events", "lead_events", "ledger", "ledger-events", "ledger-events-prev", "activity", "activity-all"];

export const TRACKER_INVALIDATIONS: Record<string, string[]> = {
  leads: [...LEAD_KEYS, ...CRM_KEYS],
  lead_events: [...EVENT_KEYS, "dashboard-counts", "outreach-auto"],
  lead_followups: [...LEAD_KEYS, ...CRM_KEYS, "lead-followups", "followups"],
  lead_contacts: [...LEAD_KEYS, ...CRM_KEYS, "lead-contacts"],
  lead_links: [...LEAD_KEYS, "lead-links"],
  lead_tags: [...LEAD_KEYS, "lead_tags", "lead-tags-filter", "lead-tags-map", "tags"],
  lead_tasks: ["lead-tasks", "lead_tasks", "tasks"],
  crm_records: [...CRM_KEYS, "lead_detail", "dashboard-replies-not-in-crm"],
  crm_contact_log: [...CRM_KEYS, "crm_contact_log", "crm-activity", "activity-all"],
  outreach_daily: ["outreach-daily", "ledger", "dashboard-counts"],
  outreach_targets: ["outreach-targets", "outreach_targets"],
  stages: ["stages", ...LEAD_KEYS, ...CRM_KEYS],
  profiles: ["profiles", "all_profiles"],
  user_permissions: ["user-permissions", "all_user_permissions"],
  permission_presets: ["permission_presets"],
  followup_templates: ["followup_templates"],
  channels: ["channels"],
  countries: ["countries"],
  sender_accounts: ["sender_accounts", "dashboard-warmup"],
  tags: ["tags", "lead-tags-map"],
};

export function trackerQueryMatches(tables: string[], queryKey: readonly unknown[]) {
  return tables.some((table) => TRACKER_INVALIDATIONS[table]?.includes(String(queryKey[0])));
}

export function invalidateTrackerQueries(client: QueryClient, tables: string[] = ["leads", "lead_events"]) {
  return client.invalidateQueries({ predicate: (query) => trackerQueryMatches(tables, query.queryKey) });
}