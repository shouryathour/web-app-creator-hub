import { createFileRoute } from "@tanstack/react-router";
import { TodosView } from "@/components/lt/todos-view";

export const Route = createFileRoute("/lt/todos")({
  head: () => ({ meta: [{ title: "To-dos | Lead Tracker | Buzzspear" },
      { name: "description", content: "Manage your team’s lead tasks in Buzzspear." },
      { property: "og:title", content: "To-dos | Lead Tracker | Buzzspear" },
      { property: "og:description", content: "Manage your team’s lead tasks in Buzzspear." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ] }),
  component: () => <TodosView module="lead" perm="lead.leads" />,
});
