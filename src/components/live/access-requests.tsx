import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/live/auth";
import { Button } from "@/components/ui/button";
import { removeAccessRequest } from "@/lib/live/access.functions";

type Req = { user_id: string; email: string | null; full_name: string | null; created_at: string };

/** Owner-only notice: new people who signed in and wait to be let in or removed. */
export function AccessRequests() {
  const { workspace } = useAuth();
  const isOwner = workspace?.role === "owner";
  const qc = useQueryClient();
  const remove = useServerFn(removeAccessRequest);
  const [roles, setRoles] = useState<Record<string, "admin" | "member">>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["access-requests"],
    enabled: isOwner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_requests")
        .select("user_id, email, full_name, created_at")
        .eq("status", "pending")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Req[];
    },
  });

  useEffect(() => {
    if (!isOwner) return;
    const ch = supabase
      .channel("access-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "access_requests" }, () => {
        void qc.invalidateQueries({ queryKey: ["access-requests"] });
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [isOwner, qc]);

  if (!isOwner || data.length === 0) return null;

  const approve = async (r: Req) => {
    setBusy(r.user_id);
    const { error } = await supabase.rpc("approve_access", { _user: r.user_id, _role: roles[r.user_id] ?? "admin" });
    setBusy(null);
    if (error) return void toast.error(error.message);
    toast.success(`${r.full_name || r.email} is now on the team`);
    void qc.invalidateQueries();
  };
  const reject = async (r: Req) => {
    setBusy(r.user_id);
    try {
      await remove({ data: { userId: r.user_id } });
      toast.success(`${r.full_name || r.email} was removed`);
      void qc.invalidateQueries({ queryKey: ["access-requests"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2 border-b border-border bg-accent/40 px-4 py-3">
      {data.map((r) => (
        <div key={r.user_id} className="flex flex-wrap items-center gap-2 text-[13px]">
          <Bell className="size-4 text-primary" />
          <span>
            <b>{r.full_name || r.email}</b>
            {r.full_name && r.email ? ` (${r.email})` : ""} signed in. Let them in or remove?
          </span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-[12px]"
            value={roles[r.user_id] ?? "admin"}
            onChange={(e) => setRoles((s) => ({ ...s, [r.user_id]: e.target.value as "admin" | "member" }))}
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          <Button size="sm" disabled={busy === r.user_id} onClick={() => void approve(r)}>Approve</Button>
          <Button size="sm" variant="outline" disabled={busy === r.user_id} onClick={() => void reject(r)}>Remove</Button>
        </div>
      ))}
    </div>
  );
}
