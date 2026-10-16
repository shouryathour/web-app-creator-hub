import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/sheet-backup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const h = await import("@/lib/sheet-backup.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("app_settings").select("workspace_id, value").eq("key", h.BACKUP_KEY);
        let ran = 0;
        let failed = 0;
        for (const row of (data ?? []) as { workspace_id: string | null; value: unknown }[]) {
          const cfg = (row.value ?? {}) as import("@/lib/sheet-backup.server").BackupConfig;
          if (!row.workspace_id || cfg.enabled === false || cfg.disconnected) continue;
          if (cfg.interval === "daily" && cfg.lastRunAt && Date.now() - new Date(cfg.lastRunAt).getTime() < 23.5 * 3600_000) continue;
          try {
            await h.pushWorkspace(row.workspace_id, { auto: true });
            ran++;
          } catch (e) {
            failed++;
            console.error("Scheduled sheet backup failed", row.workspace_id, e);
          }
        }
        return Response.json({ ran, failed });
      },
    },
  },
});
