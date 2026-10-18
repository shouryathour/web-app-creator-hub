import { createFileRoute } from "@tanstack/react-router";
import { ActivityView } from "@/components/lt/activity-view";

export const Route = createFileRoute("/lt/activity")({
  head: () => ({ meta: [{ title: "Activity | Lead Tracker | Buzzspear" },
      { name: "description", content: "Review outreach activity across your Buzzspear leads." },
      { property: "og:title", content: "Activity | Lead Tracker | Buzzspear" },
      { property: "og:description", content: "Review outreach activity across your Buzzspear leads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ] }),
  component: () => <ActivityView module="lead" perm="lead.leads" />,
});
