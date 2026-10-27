import { pct } from "./percentage";
export const BUILTIN = [
  { kind: "email", label: "Email" },
  { kind: "instagram", label: "Instagram" },
  { kind: "linkedin", label: "LinkedIn" },
] as const;
type BuiltinKind = (typeof BUILTIN)[number]["kind"];

export type Tile = { key: string; label: string; value: string; hasData: boolean; detail: string; bar: number };

/* eslint-disable @typescript-eslint/no-explicit-any */
export type RateLead = Record<string, any>;

function tile(key: string, label: string, n: number, d: number): Tile {
  const r = pct(n, d) as { text: string; hasData: boolean };
  const text = r.text;
  const hasData = r.hasData;
  return { key, label, value: text, hasData, detail: `${n}/${d}`, bar: hasData ? Math.max(0, Math.min(100, parseFloat(text) || 0)) : 0 };
}

const anySent = (l: RateLead) => l.email_sent || l.instagram_sent || l.linkedin_sent;
const anyReplied = (l: RateLead) => l.email_replied || l.instagram_replied || l.linkedin_replied;

export function computeTiles(leads: RateLead[], scope: string, channels: any[]): Tile[] {
  const kindOf = (id: string | null) => channels.find((c) => c.id === id)?.kind;
  const isOther = (id: string | null) => kindOf(id) === "other";
  let pool: RateLead[];
  let isSent: (l: RateLead) => boolean;
  let isReplied: (l: RateLead) => boolean;
  const tiles: Tile[] = [];
  if (scope === "email" || scope === "instagram" || scope === "linkedin") {
    const k = scope as BuiltinKind;
    const sent = (l: RateLead) => (k === "email" ? l.email_sent : k === "instagram" ? l.instagram_sent : l.linkedin_sent);
    pool = leads.filter((l) => kindOf(l.channel_id) === k || sent(l) || (k === "email" ? l.email_replied || l.email_viewed : k === "instagram" ? l.instagram_replied : l.linkedin_replied || l.linkedin_connection_sent));
    isSent = sent;
    isReplied = (l) => (k === "email" ? l.email_replied : k === "instagram" ? l.instagram_replied : l.linkedin_replied);
    const label = BUILTIN.find((b) => b.kind === k)?.label ?? k;
    const sentCount = pool.filter(isSent).length;
    if (k === "linkedin")
      tiles.push(tile("connection", "Connection request rate", pool.filter((l) => l.linkedin_connection_sent).length, pool.length));
    tiles.push(tile("sent", `${label} sent rate`, sentCount, pool.length));
    if (k === "email") tiles.push(tile("view", "Email view rate", pool.filter((l) => l.email_sent && l.email_viewed).length, sentCount));
  } else if (scope === "all") {
    pool = leads;
    isSent = (l) => anySent(l) || isOther(l.contacted_channel_id);
    isReplied = (l) => anyReplied(l) || isOther(l.reply_channel_id);
    const s = pool.filter(isSent).length;
    tiles.push(tile("sent", "Outreach sent rate", s, pool.length));
    tiles.push(tile("email_sent", "Email sent rate", pool.filter((l) => l.email_sent).length, pool.length));
    tiles.push(tile("instagram_sent", "Instagram sent rate", pool.filter((l) => l.instagram_sent).length, pool.length));
    tiles.push(tile("linkedin_sent", "LinkedIn sent rate", pool.filter((l) => l.linkedin_sent).length, pool.length));
    tiles.push(tile("view", "Email view rate", pool.filter((l) => l.email_sent && l.email_viewed).length, pool.filter((l) => l.email_sent).length));
  } else {
    const id = scope;
    const name = channels.find((c) => c.id === id)?.name ?? "Channel";
    pool = leads.filter((l) => l.channel_id === id || l.contacted_channel_id === id);
    isSent = (l) => l.contacted_channel_id === id || anySent(l);
    isReplied = (l) => l.reply_channel_id === id || anyReplied(l) || l.reply_sentiment != null;
    tiles.push(tile("sent", `${name} sent rate`, pool.filter(isSent).length, pool.length));
  }
  const sent = pool.filter(isSent);
  // Each step only counts leads that also did the step before it in this period, so no rate passes 100%.
  const replied = sent.filter(isReplied);
  const loomSent = sent.filter((l) => l.loom_sent);
  const loomWatched = loomSent.filter((l) => l.loom_watched);
  const watchPcts = loomWatched.filter((l) => Number.isFinite(l.loom_watch_percent) && l.loom_watch_percent >= 0 && l.loom_watch_percent <= 100).map((l) => l.loom_watch_percent as number);
  const meetings = replied.filter((l) => l.meeting_booked);
  const avg = watchPcts.length ? watchPcts.reduce((a, b) => a + b, 0) / watchPcts.length : 0;
  tiles.push(tile("reply", "Reply rate", replied.length, sent.length));
  tiles.push(tile("positive", "Positive reply rate", replied.filter((l) => l.reply_sentiment === "positive").length, replied.length));
  tiles.push(tile("negative", "Negative reply rate", replied.filter((l) => l.reply_sentiment === "negative").length, replied.length));
  tiles.push(tile("loom_sent", "Loom sent rate", loomSent.length, sent.length));
  tiles.push(tile("loom_view", "Loom view rate", loomWatched.length, loomSent.length));
  tiles.push({
    key: "loom_watch",
    label: "Avg Loom watch %",
    value: watchPcts.length ? `${Math.round(avg)}%` : "0%",
    hasData: watchPcts.length > 0,
    detail: `over ${watchPcts.length} watched`,
    bar: watchPcts.length ? Math.round(avg) : 0,
  });
  tiles.push(tile("meetings", "Meetings booked rate", meetings.length, replied.length));
  tiles.push(tile("close", "Client close rate", meetings.filter((l) => l.client_closed).length, meetings.length));
  return tiles;
}

