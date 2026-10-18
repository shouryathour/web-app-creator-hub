import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/live/auth";
import { Loading } from "@/components/live/kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tracker | Buzzspear" },
      { name: "description", content: "Cold outreach pipeline, CRM and revenue tracking in one place." },
      { property: "og:title", content: "Tracker | Buzzspear" },
      { property: "og:description", content: "Cold outreach pipeline, CRM and revenue tracking in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { loading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    void navigate({ to: session ? "/modules" : "/auth" });
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loading label="Loading Tracker" />
    </div>
  );
}
