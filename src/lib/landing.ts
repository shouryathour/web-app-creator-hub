// Picks the first page a member may open, in menu order, so nobody lands on a blocked page.
export const LEAD_PAGES: { to: string; perm: string }[] = [
  { to: "/lt/dashboard", perm: "lead.dashboard" },
  { to: "/lt/leads", perm: "lead.leads" },
  { to: "/lt/followups", perm: "lead.followups" },
  { to: "/lt/outreach", perm: "lead.outreach_tracker" },
  { to: "/lt/ledger", perm: "lead.ledger" },
  { to: "/lt/archive", perm: "lead.archive" },
  { to: "/lt/data", perm: "lead.import_export" },
];
export const CRM_PAGES: { to: string; perm: string }[] = [
  { to: "/crm/dashboard", perm: "crm.records" },
  { to: "/crm/pipeline", perm: "crm.pipeline" },
  { to: "/crm/followups", perm: "crm.followups" },
  { to: "/crm/revenue", perm: "crm.revenue" },
];

export function firstAllowedPath(
  can: (perm: string) => boolean,
  preferred: "lead" | "crm" | null = null,
  only?: "lead" | "crm",
): string | null {
  const lead = can("module.lead_tracker") ? LEAD_PAGES : [];
  const crm = can("module.crm") ? CRM_PAGES : [];
  const order = only === "lead" ? [lead] : only === "crm" ? [crm] : preferred === "crm" ? [crm, lead] : [lead, crm];
  for (const list of order) for (const p of list) if (can(p.perm)) return p.to;
  return null;
}
