// Old per-channel page; all leads now live in All Leads.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/lt/leads/linkedin")({
  beforeLoad: () => {
    throw redirect({ to: "/lt/leads", replace: true });
  },
});
