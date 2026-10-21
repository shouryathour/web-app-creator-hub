import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateTrackerQueries } from "@/lib/tracker-updates";

const WATCHED_TABLES = [
  "leads",
  "lead_events",
  "lead_followups",
  "lead_contacts",
  "lead_links",
  "lead_tags",
  "lead_tasks",
  "crm_records",
  "crm_contact_log",
  "outreach_daily",
  "outreach_targets",
  "stages",
  "profiles",
  "user_permissions",
  "permission_presets",
  "followup_templates",
  "channels",
  "sender_accounts",
  "countries",
  "tags",
] as const;

/**
 * Refresh only views affected by changed tables, batching bursts of activity.
 */
export function useGlobalRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const changed = new Set<string>();
    const refresh = (table: string) => {
      changed.add(table);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const tables = [...changed];
        changed.clear();
        void invalidateTrackerQueries(qc, tables);
      }, 250);
    };

    const channel = supabase.channel("tracker-realtime");
    for (const table of WATCHED_TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => refresh(table));
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}
