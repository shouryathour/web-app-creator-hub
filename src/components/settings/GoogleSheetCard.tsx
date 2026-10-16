import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CircleCheck, ExternalLink, Loader2, Plug, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSheetStatus, setSheetConnected, syncLeadsToSheet } from "@/lib/sheets.functions";

const KEYS = [["google_sheet_status"], ["app_settings", "google_sheet"], ["app_settings", "auto_backup"]];

export function GoogleSheetCard() {
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getSheetStatus);
  const runSync = useServerFn(syncLeadsToSheet);
  const setConn = useServerFn(setSheetConnected);
  const status = useQuery({ queryKey: ["google_sheet_status"], queryFn: () => fetchStatus() });
  const refresh = () => KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k }));

  const sync = useMutation({
    mutationFn: () => runSync(),
    onSuccess: (r) => { toast.success(`Saved ${r.lastRowCount ?? 0} leads to your Google Sheet`); refresh(); },
    onError: (e: unknown) => { toast.error(e instanceof Error ? e.message : "Sync failed"); refresh(); },
  });
  const conn = useMutation({
    mutationFn: (connected: boolean) => setConn({ data: { connected } }),
    onSuccess: (_r, connected) => { toast.success(connected ? "Google connected" : "Google disconnected"); refresh(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  if (status.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const sheet = status.data?.sheet ?? {};
  const available = status.data?.connected ?? false;
  const connected = available && !sheet.disconnected;
  const last = sheet.lastSyncedAt ? new Date(sheet.lastSyncedAt).toLocaleString() : null;

  if (!connected) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">
          {available ? "Google is disconnected. Your leads are not being backed up." : "Google is not connected to this app yet."}
        </p>
        {available && (
          <Button size="sm" className="w-fit" disabled={conn.isPending} onClick={() => conn.mutate(true)}>
            <Plug className="mr-2 h-4 w-4" /> Connect Google
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <CircleCheck className="h-4 w-4 text-primary" /> Connected to your Google account
      </div>
      <p className="text-muted-foreground">
        {sheet.spreadsheetId
          ? `Your leads are backed up to a sheet in your own Google Drive. Last sync: ${last ?? "not yet"}.`
          : "No backup sheet yet. Press Sync now and it will be created in your Google Drive."}
      </p>
      <div className="flex flex-wrap gap-2">
        {sheet.spreadsheetUrl && (
          <Button size="sm" variant="outline" asChild>
            <a href={sheet.spreadsheetUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Open Google Sheet
            </a>
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={sync.isPending} onClick={() => sync.mutate()}>
          {sync.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sync now
        </Button>
        <Button size="sm" variant="outline" disabled={conn.isPending} onClick={() => conn.mutate(false)}>
          <Unplug className="mr-2 h-4 w-4" /> Disconnect
        </Button>
      </div>
      {sheet.spreadsheetId && (
        <iframe
          title="Google Sheet backup"
          src={`https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}/edit?rm=minimal`}
          className="h-[520px] w-full rounded-md border border-border bg-background"
        />
      )}
    </div>
  );
}
