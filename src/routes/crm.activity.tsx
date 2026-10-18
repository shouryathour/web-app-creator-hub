// Ported from live chunk crm.activity-BoLWCmBN.js.
import { createFileRoute } from "@tanstack/react-router";
import { ActivityView } from "@/components/crm/ActivityView";

export const Route = createFileRoute("/crm/activity")({
  head: () => ({
    meta: [
      { title: "Activity | CRM | Tracker | Buzzspear" },
      { name: "description", content: "Every activity across your leads. Add, correct or delete entries." },
      { property: "og:title", content: "Activity | CRM | Tracker | Buzzspear" },
      { property: "og:description", content: "Every activity across your leads. Add, correct or delete entries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ActivityView module="crm" perm="crm.records" />,
});
