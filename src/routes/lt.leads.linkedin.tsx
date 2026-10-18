// Ported from live chunk lt.leads.linkedin-*.js
import { createFileRoute } from "@tanstack/react-router";
import { AppPage } from "@/components/app-shell";
import { LeadQuickAdd, TodayLeadStream } from "@/components/lt/today-lead-stream";
import { ChannelOutreachRates, useRateRange } from "@/components/lt/outreach-rates";

export const Route = createFileRoute("/lt/leads/linkedin")({
  head: () => ({ meta: [{ title: "LinkedIn Leads | Lead Tracker | Buzzspear" },
      { name: "description", content: "Add and manage LinkedIn leads in Buzzspear." },
      { property: "og:title", content: "LinkedIn Leads | Lead Tracker | Buzzspear" },
      { property: "og:description", content: "Add and manage LinkedIn leads in Buzzspear." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ] }),
  component: LinkedInLeadsPage,
});

function LinkedInLeadsPage() {
  const range = useRateRange("week");
  return (
    // live: guide="rapid-entry" (repo AppPage has no guide prop)
    <AppPage module="lead" title="LinkedIn Leads" perm="lead.leads">
      <div className="flex flex-col gap-4">
        <LeadQuickAdd kind="linkedin" />
        <ChannelOutreachRates kind="linkedin" label="LinkedIn" range={range} />
        <TodayLeadStream kind="linkedin" range={range} />
      </div>
    </AppPage>
  );
}
