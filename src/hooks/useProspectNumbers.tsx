import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Display-only "Prospect N" numbers, oldest lead = 1. */
export function useProspectNumbers() {
  return useQuery({
    queryKey: ["leads", "prospect-numbers"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("prospect_numbers");
      if (error) throw error;
      const m = new Map<string, number>();
      for (const r of data ?? []) m.set(r.id, Number(r.n));
      return m;
    },
  });
}

export function ProspectBadge({ id }: { id: string }) {
  const { data } = useProspectNumbers();
  const n = data?.get(id);
  if (!n) return null;
  return <span className="ml-1.5 rounded bg-subtle px-1.5 py-px text-[11px] font-medium text-muted-foreground">Prospect {n}</span>;
}
