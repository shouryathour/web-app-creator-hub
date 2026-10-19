import { db } from "@/lib/live/db";
import { normalizeEmail, normalizeInstagram, normalizeLinkedIn, normalizeWebsite } from "@/lib/live/config";

export type LeadSearchHit = {
  id: string;
  company_name: string | null;
  lead_code: string | null;
  archived: boolean;
  matched?: string;
};

/** Cleans pasted text: trims, drops a leading mailto:, lowercases emails. */
export function cleanSearch(raw: string): { text: string; email: string | null } {
  const text = raw.trim().replace(/^mailto:/i, "").trim();
  const email = text.includes("@") ? normalizeEmail(text)?.toLowerCase() ?? null : null;
  return { text, email };
}

export function escapeLike(v: string) {
  return v.replace(/[\\%_,()]/g, (c) => `\\${c}`);
}

const COLS = "id, company_name, lead_code, archived";

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Finds leads by email (any person, extra emails), social/website link, or text. Includes archived leads. */
export async function findLeadsBySearch(raw: string, limit = 10): Promise<LeadSearchHit[]> {
  const { text, email } = cleanSearch(raw);
  if (text.length < 2) return [];
  const hits = new Map<string, LeadSearchHit>();
  const add = (l: any, matched?: string) => {
    if (l && !hits.has(l.id)) hits.set(l.id, { id: l.id, company_name: l.company_name, lead_code: l.lead_code, archived: !!l.archived, matched });
  };

  if (email) {
    const p = escapeLike(email);
    const [c1, c2, l1] = await Promise.all([
      db.from("lead_contacts").select(`email, person_name, leads(${COLS})`).ilike("email", p).limit(limit),
      db.from("lead_contacts").select(`email, person_name, leads(${COLS})`).contains("emails", JSON.stringify([email])).limit(limit),
      db.from("leads").select(COLS).ilike("primary_contact", p).limit(limit),
    ]);
    for (const r of [...((c1.data ?? []) as any[]), ...((c2.data ?? []) as any[])])
      add(r.leads, [email, r.person_name].filter(Boolean).join(", "));
    for (const r of (l1.data ?? []) as any[]) add(r, email);
    return [...hits.values()];
  }

  const ig = /instagram\.com/i.test(text) ? normalizeInstagram(text) : null;
  const li = /linkedin\.com/i.test(text) ? normalizeLinkedIn(text) : null;
  if (ig) {
    const p = `%instagram.com/${escapeLike(ig.handle)}%`;
    const [a, b] = await Promise.all([
      db.from("leads").select(COLS).ilike("instagram_url", p).limit(limit),
      db.from("lead_contacts").select(`person_name, leads(${COLS})`).ilike("instagram_url", p).limit(limit),
    ]);
    ((a.data ?? []) as any[]).forEach((r) => add(r, "Instagram"));
    ((b.data ?? []) as any[]).forEach((r) => add(r.leads, `Instagram, ${r.person_name ?? ""}`));
    return [...hits.values()];
  }
  if (li) {
    const p = `%linkedin.com/${li.kind === "person" ? "in" : "company"}/${escapeLike(li.slug)}%`;
    const [a, b] = await Promise.all([
      db.from("leads").select(COLS).ilike("company_linkedin_url", p).limit(limit),
      db.from("lead_contacts").select(`person_name, leads(${COLS})`).ilike("linkedin_url", p).limit(limit),
    ]);
    ((a.data ?? []) as any[]).forEach((r) => add(r, "LinkedIn"));
    ((b.data ?? []) as any[]).forEach((r) => add(r.leads, `LinkedIn, ${r.person_name ?? ""}`));
    return [...hits.values()];
  }
  const site = /\.[a-z]{2,}/i.test(text) && !/\s/.test(text) ? normalizeWebsite(text) : null;
  const t = escapeLike(text);
  const [named, people] = await Promise.all([
    db.from("leads").select(COLS)
      .or(`company_name.ilike.%${t}%,lead_code.ilike.%${t}%,primary_contact.ilike.%${t}%${site ? `,website_url.ilike.%${escapeLike(site.domain)}%` : ""}`)
      .limit(limit),
    db.from("lead_contacts").select(`person_name, email, leads(${COLS})`).or(`person_name.ilike.%${t}%,email.ilike.%${t}%`).limit(limit),
  ]);
  ((named.data ?? []) as any[]).forEach((r) => add(r));
  ((people.data ?? []) as any[]).forEach((r) => add(r.leads, [r.person_name, r.email].filter(Boolean).join(", ")));
  return [...hits.values()].slice(0, limit);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
