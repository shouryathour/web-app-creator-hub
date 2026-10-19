export const SENDER_COLORS = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#DB2777", "#65A30D", "#EA580C", "#4F46E5"];

/** Fallback color when a sender has none saved: stable per id. */
export function senderColor(s: { id: string; color?: string | null }): string {
  if (s.color) return s.color;
  let h = 0;
  for (const ch of s.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SENDER_COLORS[h % SENDER_COLORS.length];
}

type StageLite = { id: string; name: string; order_index: number };

/**
 * Stage the lead should move to after an email tick. Never moves backwards:
 * returns null unless the target stage sits after the current one.
 */
export function emailStageTarget(
  stages: StageLite[],
  currentStageId: string | null,
  flags: { sent: boolean; viewed: boolean; replied: boolean },
): string | null {
  const want = flags.replied ? "replied" : flags.sent || flags.viewed ? "contacted" : null;
  if (!want) return null;
  const target = stages.find((s) => s.name.trim().toLowerCase() === want);
  if (!target) return null;
  const cur = stages.find((s) => s.id === currentStageId);
  if (cur && cur.order_index >= target.order_index) return null;
  return target.id;
}
