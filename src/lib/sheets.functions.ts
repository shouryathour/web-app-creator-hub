import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSheetStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const h = await import("./sheet-backup.server");
    const ws = await h.workspaceOf(context.userId);
    return { connected: h.googleConnected(), sheet: await h.readConfig(ws) };
  });

export const syncLeadsToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const h = await import("./sheet-backup.server");
    return h.pushWorkspace(await h.workspaceOf(context.userId));
  });

export const setSheetConnected = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connected: boolean }) => ({ connected: Boolean(d.connected) }))
  .handler(async ({ data, context }) => {
    const h = await import("./sheet-backup.server");
    const ws = await h.workspaceOf(context.userId);
    return h.writeConfig(ws, { disconnected: !data.connected, ...(data.connected ? {} : { enabled: false }) });
  });
