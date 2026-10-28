import type { EarningsDeal, ValueFns } from "@/components/crm/earnings";

/** Close-month earnings only: never invent future contract payments. */
export function monthlyClientAmount<T extends EarningsDeal>(deal: T, fx: ValueFns<T>): number {
  const recurring = deal.deal_type === "retainer" || deal.deal_type === "hybrid";
  const amount = deal.usd_value_manual && deal.received_amount != null
    ? fx.value(deal)
    : recurring && Number(deal.mrr_amount) > 0
      ? fx.mrr(deal) + (deal.deal_type === "hybrid" ? fx.value(deal) : 0)
      : fx.value(deal);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

export function monthEarnings<T extends EarningsDeal>(deals: T[], month: string, fx: ValueFns<T>) {
  const clients = deals.filter((d) => d.closed_at?.slice(0, 7) === month);
  const total = clients.reduce((sum, d) => sum + monthlyClientAmount(d, fx), 0);
  return { clients, total, average: clients.length ? total / clients.length : 0 };
}