import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppPage } from "@/components/app-shell";
import { ChatWindow, ThreadList, loadThreadMessages } from "@/components/ai/ask-ai";

export const Route = createFileRoute("/ai/$threadId")({
  head: () => ({
    meta: [
      { title: "Chat | Ask AI | Buzzspear" },
      { name: "description", content: "A saved Ask AI conversation about your tracker." },
      { property: "og:title", content: "Chat | Ask AI | Buzzspear" },
      { property: "og:description", content: "A saved Ask AI conversation about your tracker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["ai-messages", threadId],
    queryFn: () => loadThreadMessages(threadId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  return (
    <AppPage module="lead" title="Ask AI" perm="ai.chat">
      <div className="flex flex-col gap-4 md:flex-row">
        <ThreadList activeId={threadId} />
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>
        ) : error ? (
          <p className="text-sm text-destructive">Could not open this chat.</p>
        ) : (
          <ChatWindow key={threadId} threadId={threadId} initial={data ?? []} />
        )}
      </div>
    </AppPage>
  );
}
