import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/components/live/kit";

export function EarningsChart({ data, currency, onSelect }: {
  data: { month: string; label: string; value: number; clients: number }[];
  currency: string;
  onSelect: (month: string) => void;
}) {
  return <div className="h-72 w-full min-w-0">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 12, left: 12, bottom: 8 }} onClick={(state) => {
        const month = state?.activePayload?.[0]?.payload?.month;
        if (typeof month === "string") onSelect(month);
      }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <YAxis width={85} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => money(v, currency)} />
        <Tooltip cursor={{ fill: "var(--muted)" }} content={({ active, payload }) => {
          const row = payload?.[0]?.payload;
          if (!active || !row) return null;
          return <div className="rounded-md border border-border bg-popover p-3 text-[13px] text-popover-foreground shadow-md">
            <div className="font-medium">{row.label}</div>
            <div>{money(row.value, currency)} · {row.clients} clients</div>
            <div className="text-muted-foreground">Average {money(row.clients ? row.value / row.clients : 0, currency)} / client</div>
          </div>;
        }} />
        <Bar dataKey="value" fill="var(--color-positive)" radius={[3, 3, 0, 0]} className="cursor-pointer" />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}