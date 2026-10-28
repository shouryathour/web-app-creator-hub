/** Groups won deals into the 12 months of `year` by their close date (local time). Deals without a close date are skipped. */
export function clientsByMonth<T extends { closed_at: string | null }>(won: T[], year: number): T[][] {
  const out: T[][] = Array.from({ length: 12 }, () => []);
  for (const r of won) {
    if (!r.closed_at) continue;
    const d = new Date(r.closed_at);
    if (d.getFullYear() === year) out[d.getMonth()].push(r);
  }
  return out;
}
