import { createFileRoute } from "@tanstack/react-router";
import { MessageSquarePlus } from "lucide-react";
import { AppPage } from "@/components/app-shell";
import { ThreadList } from "@/components/ai/ask-ai";

export const Route = createFileRoute("/ai/")({
  head: () => ({
    meta: [
      { title: "Ask AI | Buzzspear" },
      { name: "description", content: "Ask questions about your leads, outreach and CRM in plain English." },
      { property: "og:title", content: "Ask AI | Buzzspear" },
      { property: "og:description", content: "Ask questions about your leads, outreach and CRM in plain English." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiHome,
});

function AiHome() {
  return (
    <AppPage module="lead" title="Ask AI" perm="ai.chat">
      <div className="flex flex-col gap-4 md:flex-row">
        <ThreadList />
        <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <MessageSquarePlus className="mb-3 size-7 text-foreground" />
          Pick a past chat, or press <b className="mx-1 text-foreground">New chat</b> to ask about your leads, outreach and CRM.
        </div>
      </div>
    </AppPage>
  );
}
