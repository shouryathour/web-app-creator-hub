type Row = Record<string, any>;

/** [later, earlier, laterLabel, earlierLabel] — later event can't happen before earlier event. */
export const DATE_ORDER: [string, string, string, string][] = [
  ["email_viewed", "email_sent", "Viewed", "the email was sent"],
  ["email_replied", "email_sent", "Replied", "the email was sent"],
  ["loom_watched", "loom_sent", "Watched", "the Loom was sent"],
  ["linkedin_sent", "linkedin_connection_sent", "Message", "the connection request"],
  ["linkedin_replied", "linkedin_sent", "Replied", "the LinkedIn message"],
  ["instagram_replied", "instagram_sent", "Replied", "the Instagram message"],
];

const day = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 10) : null);
const fmt = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** Returns field → warning for every ticked event dated before its prerequisite. Compared by calendar day. */
export function dateOrderIssues(lead: Row): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [later, earlier, laterLabel, earlierLabel] of DATE_ORDER) {
    if (!lead[later] || !lead[earlier]) continue;
    const a = day(lead[`${later}_at`]);
    const b = day(lead[`${earlier}_at`]);
    if (a && b && a < b && !out[later]) out[later] = `${laterLabel} ${fmt(a)} is before ${earlierLabel} (${fmt(b)}) — check the dates.`;
  }
  return out;
}
