/**
 * Archived leads must not show up in working views — in the CRM section or in
 * Lead Tracker.
 *
 * Every list query that spans many leads (CRM deals, to-dos, activity) embeds
 * its lead with `LEAD_INNER_EMBED` and then passes the query through
 * `excludeArchivedLeads`, so archived leads disappear from lists, pipeline
 * boards, dashboards, revenue totals, follow-up queues and the activity log at
 * once instead of being filtered screen by screen. A plain (left-join) lead
 * embed makes the filter a no-op, so the embed must stay inner.
 *
 * CSV exports and Google Sheet backups deliberately do NOT use this: they keep
 * every row so nothing is lost from the backup.
 */
export const LEAD_INNER_EMBED = "leads!inner";

export function excludeArchivedLeads<T extends { eq: (column: string, value: unknown) => T }>(query: T): T {
  return query.eq("leads.archived", false);
}
