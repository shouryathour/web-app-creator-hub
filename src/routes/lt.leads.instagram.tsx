// Old per-channel page; all leads now live in All Leads.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/lt/leads/instagram")({
  beforeLoad: () => {
    throw redirect({ to: "/lt/leads", replace: true });
  },
});
