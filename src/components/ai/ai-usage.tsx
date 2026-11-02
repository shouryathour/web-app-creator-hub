import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const money = (n: number) => (n < 0.01 && n > 0 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);

export function AiUsageSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("created_at,model,input_tokens,output_tokens,cost_usd,thread_id,ai_threads(title)")
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      const byDay = new Map<string, { cost: number; tokens: number; replies: number }>();
      const byThread = new Map<string, { title: string; cost: number; tokens: number; last: string }>();
      let total = 0;
      for (const r of data ?? []) {
        const c = Number(r.cost_usd);
        const t = r.input_tokens + r.output_tokens;
        total += c;
        const day = new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
        const d = byDay.get(day) ?? { cost: 0, tokens: 0, replies: 0 };
        byDay.set(day, { cost: d.cost + c, tokens: d.tokens + t, replies: d.replies + 1 });
        const th = byThread.get(r.thread_id) ?? { title: (r.ai_threads as any)?.title ?? "Chat", cost: 0, tokens: 0, last: r.created_at };
        byThread.set(r.thread_id, { ...th, cost: th.cost + c, tokens: th.tokens + t });
      }
      return { total, byDay: [...byDay.entries()], byThread: [...byThread.entries()] };
    },
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data || data.byDay.length === 0) return <p className="text-sm text-muted-foreground">No AI chats yet.</p>;
  return (
    <div className="flex flex-col gap-5 text-sm">
      <p>Total spent on your chats: <b>{money(data.total)}</b> <span className="text-xs text-muted-foreground">(estimate from Anthropic's list prices; your Anthropic bill is the exact figure)</span></p>
      <div>
        <div className="section-label mb-1.5">By day</div>
        <table className="w-full text-left text-[13px]">
          <thead className="text-xs text-muted-foreground"><tr><th className="py-1">Day</th><th>Replies</th><th>Tokens</th><th className="text-right">Cost</th></tr></thead>
          <tbody>
            {data.byDay.map(([day, v]) => (
              <tr key={day} className="border-t border-border"><td className="py-1.5">{day}</td><td>{v.replies}</td><td>{v.tokens.toLocaleString()}</td><td className="text-right">{money(v.cost)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <div className="section-label mb-1.5">By chat</div>
        <table className="w-full text-left text-[13px]">
          <tbody>
            {data.byThread.map(([id, v]) => (
              <tr key={id} className="border-t border-border">
                <td className="py-1.5"><Link to="/ai/$threadId" params={{ threadId: id }} className="hover:underline">{v.title}</Link></td>
                <td>{v.tokens.toLocaleString()} tokens</td>
                <td className="text-right">{money(v.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
