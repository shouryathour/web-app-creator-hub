import { useEffect, useState } from "react";
import { CollapsibleCard } from "@/components/live/kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EarningsDeal } from "@/components/crm/earnings";

export function DealMoney({ record, canEdit, onSave, saving }: {
  record: EarningsDeal;
  canEdit: boolean;
  saving: boolean;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [value, setValue] = useState("");
  const [mrr, setMrr] = useState("");
  const [currency, setCurrency] = useState("USD");
  useEffect(() => {
    setValue(record.estimated_value == null ? "" : String(record.estimated_value));
    setMrr(record.mrr_amount == null ? "" : String(record.mrr_amount));
    setCurrency(record.currency ?? "USD");
  }, [record.estimated_value, record.mrr_amount, record.currency]);
  const recurring = record.deal_type === "retainer" || record.deal_type === "hybrid";
  const valid = [value, mrr].every((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0));
  return <CollapsibleCard id="crm.money" title="Money">
    <form onSubmit={(e) => {
      e.preventDefault();
      if (!canEdit || !valid || saving) return;
      onSave({ estimated_value: value === "" ? null : Number(value), mrr_amount: mrr === "" ? null : Number(mrr), currency });
    }} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1"><span className="label-text">{recurring ? "Deal value" : "Amount"}</span><Input aria-label="Deal amount" type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} disabled={!canEdit} placeholder="Not recorded" /></label>
        {recurring && <label className="flex flex-col gap-1"><span className="label-text">Monthly amount · MRR</span><Input aria-label="Monthly amount" type="number" min="0" step="0.01" value={mrr} onChange={(e) => setMrr(e.target.value)} disabled={!canEdit} placeholder="Not recorded" /></label>}
        <div><div className="label-text mb-1">Currency</div><Select value={currency} onValueChange={setCurrency} disabled={!canEdit}>
          <SelectTrigger aria-label="Deal currency"><SelectValue /></SelectTrigger><SelectContent>{Array.from(new Set([currency, "USD", "INR", "GBP", "EUR", "CAD", "AUD", "AED", "SGD"])).map((c) => <SelectItem value={c} key={c}>{c}</SelectItem>)}</SelectContent>
        </Select></div>
      </div>
      {record.received_amount != null && <div className="text-[13px] text-muted-foreground">Previously recorded received amount: {record.received_currency ?? record.currency ?? "USD"} {record.received_amount}</div>}
      {canEdit && <Button type="submit" size="sm" className="w-fit" disabled={saving || !valid}>{saving ? "Saving…" : "Save amounts"}</Button>}
    </form>
  </CollapsibleCard>;
}