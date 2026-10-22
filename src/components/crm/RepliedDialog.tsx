import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const isReplyStage = (s?: { name?: string | null; is_won?: boolean; is_lost?: boolean } | null) =>
  !!s && !s.is_won && !s.is_lost && /repl/i.test(s.name ?? "");

type Platform = "email" | "linkedin" | "instagram";
const FIELDS: Record<Platform, { sent: string; viewed?: string; replied: string }> = {
  email: { sent: "email_sent", viewed: "email_viewed", replied: "email_replied" },
  linkedin: { sent: "linkedin_sent", replied: "linkedin_replied" },
  instagram: { sent: "instagram_sent", replied: "instagram_replied" },
};

const iso = (d: string) => (d ? new Date(`${d}T12:00:00`).toISOString() : null);

/** Asks where the reply came from and the sent/viewed/replied dates, then saves them on the lead. */
export function RepliedDialog({
  leadId,
  open,
  onCancel,
  onDone,
}: {
  leadId: string | null;
  open: boolean;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [platform, setPlatform] = useState<Platform>("email");
  const [sent, setSent] = useState("");
  const [viewed, setViewed] = useState("");
  const [replied, setReplied] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open || !leadId) return;
    (supabase as any)
      .from("leads")
      .select("email_sent_at,email_viewed_at,email_replied_at")
      .eq("id", leadId)
      .single()
      .then(({ data }: any) => {
        if (!data) return;
        if (data.email_sent_at) setSent(data.email_sent_at.slice(0, 10));
        if (data.email_viewed_at) setViewed(data.email_viewed_at.slice(0, 10));
        if (data.email_replied_at) setReplied(data.email_replied_at.slice(0, 10));
      });
  }, [open, leadId]);

  const order = (sent && viewed && viewed < sent) || (sent && replied && replied < sent);

  const save = async () => {
    if (!leadId) return;
    if (!sent || !replied) return toast.error("Add the sent and reply dates");
    setBusy(true);
    const f = FIELDS[platform];
    const patch: Record<string, unknown> = {
      [f.sent]: true,
      [`${f.sent}_at`]: iso(sent),
      [f.replied]: true,
      [`${f.replied}_at`]: iso(replied),
    };
    if (platform === "linkedin") {
      patch.linkedin_connection_sent = true;
      patch.linkedin_connection_sent_at = iso(sent);
    }
    if (f.viewed && viewed) {
      patch[f.viewed] = true;
      patch[`${f.viewed}_at`] = iso(viewed);
    }
    const { error } = await (supabase as any).from("leads").update(patch).eq("id", leadId);
    setBusy(false);
    if (error) return toast.error(error.message);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>They replied</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-[13px]">
          <div>
            <div className="label-text mb-1">Which platform?</div>
            <div className="flex gap-1">
              {(["email", "linkedin", "instagram"] as Platform[]).map((p) => (
                <Button key={p} size="sm" variant={platform === p ? "default" : "outline"} onClick={() => setPlatform(p)}>
                  {p === "email" ? "Email" : p === "linkedin" ? "LinkedIn" : "Instagram"}
                </Button>
              ))}
            </div>
          </div>
          <label className="block">
            <div className="label-text mb-1">When did you send it?</div>
            <Input type="date" value={sent} onChange={(e) => setSent(e.target.value)} />
          </label>
          {platform === "email" && (
            <label className="block">
              <div className="label-text mb-1">When did they view it?</div>
              <Input type="date" value={viewed} onChange={(e) => setViewed(e.target.value)} />
            </label>
          )}
          <label className="block">
            <div className="label-text mb-1">When did they reply?</div>
            <Input type="date" value={replied} onChange={(e) => setReplied(e.target.value)} />
          </label>
          {order && <div className="text-[12px] text-destructive">A date is before the send date — check the dates.</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={save} disabled={busy}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
