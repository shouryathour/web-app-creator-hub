/**
 * CRM screens must never show a deal whose lead has been archived.
 *
 * Every CRM deal query embeds its lead with `leads!inner(...)` and then passes
 * the query through `excludeArchivedLeads`, so archived leads disappear from
 * lists, pipeline boards, dashboards, revenue totals and follow-up queues at
 * once instead of being filtered screen by screen.
 *
 * CSV exports and Google Sheet backups deliberately do NOT use this: they keep
 * every row so nothing is lost from the backup.
 */
export const LEAD_INNER_EMBED = "leads!inner";

export function excludeArchivedLeads<T extends { eq: (column: string, value: unknown) => T }>(query: T): T {
  return query.eq("leads.archived", false);
}
