import { describe, expect, test } from "bun:test";
import { monthEarnings, monthlyClientAmount } from "../src/lib/monthly-earnings";
import type { EarningsDeal } from "../src/components/crm/earnings";

const fx = { value: (d: EarningsDeal) => Number(d.received_amount ?? d.estimated_value ?? 0), mrr: (d: EarningsDeal) => Number(d.mrr_amount ?? 0) };
describe("monthly money tracking", () => {
  test("$1,800 from two clients averages $900 and preserves individual amounts", () => {
    const clients = [{ estimated_value: 600, closed_at: "2026-09-01", updated_at: "" }, { estimated_value: 1200, closed_at: "2026-09-15", updated_at: "" }];
    const result = monthEarnings(clients, "2026-09", fx);
    expect(result.total).toBe(1800);
    expect(result.average).toBe(900);
    expect(result.clients.map((d) => monthlyClientAmount(d, fx))).toEqual([600, 1200]);
  });
  test("MRR counts only once in its close month regardless of contract length", () => {
    const clients = [{ deal_type: "retainer", mrr_amount: 900, estimated_value: 10800, contract_months: 12, closed_at: "2026-09-01", updated_at: "" }];
    expect(monthEarnings(clients, "2026-09", fx).total).toBe(900);
    expect(monthEarnings(clients, "2026-10", fx).total).toBe(0);
  });
  test("missing close date does not invent earnings from update dates", () => {
    expect(monthEarnings([{ estimated_value: 1800, closed_at: null, updated_at: "2026-09-01" }], "2026-09", fx).total).toBe(0);
  });
  test("explicit received amount overrides an estimated recurring value", () => {
    expect(monthlyClientAmount({ usd_value_manual: true, received_amount: 600, mrr_amount: 900, deal_type: "retainer", updated_at: "" }, fx)).toBe(600);
  });
});