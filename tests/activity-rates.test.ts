import { expect, test } from "bun:test";
import { activityInRange } from "../src/lib/activity-rates";
import { revenueStats } from "../src/components/crm/earnings";

test("report includes July 10–15 activity on an older lead", () => {
  const result = activityInRange([{ date_added: "2026-06-01", email_sent: true, email_sent_at: "2026-07-10T12:00:00", email_replied: true, email_replied_at: "2026-07-15T12:00:00" }], "2026-07-10", "2026-07-15");
  expect(result).toHaveLength(1);
  expect(result[0].email_sent).toBe(true);
  expect(result[0].email_replied).toBe(true);
});
test("report excludes actions outside July 10–15 even on newly added leads", () => {
  expect(activityInRange([{ date_added: "2026-07-11", email_sent: true, email_sent_at: "2026-07-09T12:00:00" }], "2026-07-10", "2026-07-15")).toHaveLength(0);
});
test("missing timestamps never invent an activity date", () => {
  expect(activityInRange([{ email_replied: true }], "2026-07-10", "2026-07-15")).toHaveLength(0);
});
test("CRM win rate counts decided deals only", () => {
  const deal = { updated_at: "2026-07-10", estimated_value: 100 };
  const stats = revenueStats({ won: [deal, deal], lost: [deal], open: Array(7).fill(deal) }, { value: d => d.estimated_value, mrr: () => 0 }, "2026-07");
  expect(stats.winRate).toBe(67);
});