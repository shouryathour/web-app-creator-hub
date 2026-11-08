# Lead numbering cleanup + Ask AI access per person

## What changes

**1. Leads list: prospect number moves to its own first column**
- New first column (header "#") that shows just the number, e.g. `221`, before Company.
- Column order becomes: # · Company · Contact · Country · Stage · Status · Channel · Added.
- The grey "Prospect 221" tag next to the company name is removed.

**2. Hide the "LEAD-0355" code from view**
- It disappears from the leads list, the side panel and the lead page header.
- It is **not deleted**. Every lead keeps its code behind the scenes because the Google Sheet backup, imports/exports and duplicate checks use it to match leads. Removing it could create duplicates or lose links, so it stays hidden instead.
- Search still finds a lead if you type its old code.
- On the lead page, the number shows as "#221" instead.

**3. Ask AI access per teammate**
- The "Ask AI chat" switch already exists, but it is missing from the access window you screenshotted (that window uses a separate list). I'll add an **AI** section with an **Ask AI chat** checkbox there, between CRM and Settings.
- Ticked = that person sees Ask AI in their menu; unticked = hidden and blocked. Nobody new gets access automatically; you and admins keep it.

## Guarantees
- No leads, contacts, follow-ups, CRM records or codes are removed or edited. Only what is shown on screen changes.

## Technical details
- `src/routes/lt.leads.index.tsx`: add leading `#` column using `useProspectNumbers`; drop `ProspectBadge` + `lead_code` span from the company cell; keep `lead_code` in search filter and CSV export.
- `src/components/app-shell.tsx` (~2080) and `src/routes/lt.leads.$id.tsx`: remove visible `lead_code`, show `#N`.
- `src/components/account/settings-permissions.ts`: add `{ label: "AI", keys: [{ key: "ai.chat", label: "Ask AI chat" }] }` matching `src/lib/permissions.ts`; ideally re-export the single list so the two can't drift again.
- Assumption: "State" in the request means Stage.
