// Live chunk: sheets.functions-BEPTSrPe.js (client stubs)
// The live chunk also bundles react-query's useQuery (export `u`); it is
// re-exported here so ports can keep the same import site.
// Export mapping:
//   u -> useQuery                    (@tanstack/react-query)
//   i -> getSheetStatus              (GET)  -> SheetStatus
//   n -> connectSheet                (POST) { url, tab } -> SheetStatus
//   c -> testSheetConnection         (POST) -> { title, sheets[] }
//   o -> pushLeadsToSheet            (POST) -> { pushed }
//   a -> pullLeadsFromSheet          (POST) -> { inserted, updated }
//   s -> runSheetBackup              (POST) quick/full backup to the sheet
//   r -> getAutoBackupSettings       (GET)  -> { enabled, interval, lastRunAt }
//   l -> setAutoBackupSettings       (POST) { enabled, interval }
//   t -> syncLeadToSheet             (POST) { leadId }
//
// All calls go through the shared engine in src/lib/sheet-backup.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export { useQuery } from "@tanstack/react-query";

export type SheetStatus = {
  url: string | null;
  tab: string | null;
  spreadsheetId: string | null;
  lastSyncAt: string | null;
};

export type AutoBackupSettings = {
  enabled: boolean;
  interval: string;
  lastRunAt?: string | null;
};

type H = typeof import("../sheet-backup.server");
async function ctx(context: unknown): Promise<{ h: H; ws: string; role: string | null }> {
  const c = await import("./server-ctx");
  const { sb, userId } = c.ctxOf(context);
  const { workspaceId, role } = await c.currentWorkspace(sb, userId);
  return { h: await import("../sheet-backup.server"), ws: workspaceId, role };
}

export const getSheetStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SheetStatus> => {
    const { h, ws } = await ctx(context);
    const v = await h.readConfig(ws);
    if (v.disconnected) return { url: null, tab: null, spreadsheetId: null, lastSyncAt: v.lastSyncedAt ?? null };
    return { url: v.spreadsheetUrl ?? null, tab: "Leads", spreadsheetId: v.spreadsheetId ?? null, lastSyncAt: v.lastSyncedAt ?? null };
  });

export const pushLeadsToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ pushed: number }> => {
    const { h, ws } = await ctx(context);
    const r = await h.pushWorkspace(ws);
    return { pushed: r.lastRowCount ?? 0 };
  });

export const pullLeadsFromSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ inserted: number; updated: number }> => {
    const { h, ws } = await ctx(context);
    return h.pullWorkspace(ws);
  });

export const runSheetBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { h, ws } = await ctx(context);
    await h.pushWorkspace(ws, { auto: true });
    return { ok: true };
  });

export const getAutoBackupSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { h, ws } = await ctx(context);
    const v = await h.readConfig(ws);
    return {
      enabled: v.enabled ?? false,
      interval: v.interval ?? "1h",
      lastRunAt: v.lastRunAt ?? null,
      lastStatus: v.lastStatus ?? null,
      lastError: v.lastError ?? null,
    };
  });

export const setAutoBackupSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { enabled: boolean; interval: string }) => ({
    enabled: Boolean(d.enabled),
    interval: d.interval === "daily" ? ("daily" as const) : ("1h" as const),
  }))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { h, ws } = await ctx(context);
    if (data.enabled && (await h.readConfig(ws)).disconnected)
      throw new Error("Connect Google in the Google Sheet section first.");
    await h.writeConfig(ws, { enabled: data.enabled, interval: data.interval });
    return { ok: true };
  });

export const syncLeadToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leadId: string }) => d)
  .handler(async (): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> => {
    // Single-lead changes are picked up by the next Push or automatic backup.
    return { ok: true, skipped: true, reason: "Saved on next backup" };
  });

export const connectSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string; tab: string }) => d)
  .handler(async ({ data, context }): Promise<SheetStatus> => {
    const { h, ws, role } = await ctx(context);
    const c = await import("./server-ctx");
    if (!c.isAdminRole(role)) throw new Error("Only workspace owners and admins can connect a sheet.");
    const m = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(String(data.url ?? ""));
    if (!m) throw new Error("That does not look like a Google Sheets link.");
    const v = await h.writeConfig(ws, { spreadsheetId: m[1], spreadsheetUrl: data.url.trim(), disconnected: false });
    return { url: v.spreadsheetUrl ?? null, tab: "Leads", spreadsheetId: v.spreadsheetId ?? null, lastSyncAt: v.lastSyncedAt ?? null };
  });

export const testSheetConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ title: string; sheets: string[] }> => {
    const { h, ws } = await ctx(context);
    const v = await h.readConfig(ws);
    if (!v.spreadsheetId) throw new Error("No sheet is connected yet.");
    const r = await h.gateway(`/spreadsheets/${v.spreadsheetId}?fields=properties.title,sheets.properties.title`);
    const props = r["properties"] as { title?: string } | undefined;
    const sheets = ((r["sheets"] as { properties?: { title?: string } }[] | undefined) ?? []).map((x) => x.properties?.title ?? "");
    return { title: props?.title ?? "Google Sheet", sheets };
  });
