import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DealPeek } from "@/components/crm/DealPeek";
import { LeadPeek } from "@/components/peek/LeadPeek";
import { useStages } from "@/hooks/useLookups";
import { closePeek, usePeek } from "@/lib/peek";
import { invalidateTrackerQueries } from "@/lib/tracker-updates";

/** One side panel for the whole app: lead lists and CRM record lists open it with a single click. */
export function GlobalPeek() {
  const peek = usePeek();
  const qc = useQueryClient();
  const { data: stages = [] } = useStages("crm");

  const patch = async (recordId: string, p: Record<string, unknown>) => {
    const { error } = await (supabase as any).from("crm_records").update(p).eq("id", recordId);
    if (error) return toast.error(error.message);
    invalidateTrackerQueries(qc, ["crm_records", "crm_record", "leads"]);
  };

  return (
    <>
      <LeadPeek leadId={peek?.kind === "lead" ? peek.id : null} onClose={closePeek} />
      <DealPeek
        recordId={peek?.kind === "record" ? peek.id : null}
        stages={stages}
        onClose={closePeek}
        onPatch={patch}
        onStageChange={(id, stageId) => {
          const s = stages.find((x) => x.id === stageId);
          if (s && (s.is_won || s.is_lost)) {
            toast.info("Open the full page or the pipeline to mark a deal won or lost.");
            return;
          }
          void patch(id, { stage_id: stageId });
        }}
      />
    </>
  );
}
