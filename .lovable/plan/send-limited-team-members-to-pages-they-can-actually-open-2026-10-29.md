# Send limited team members to pages they can actually open

## Problem
- After sign-in, everyone with Lead Tracker access is sent to the Lead Tracker Dashboard, even when "Dashboard" is unticked for them. They land on a blank page that says "You do not have access to this page."
- Opening any page they can't use (from a link or bookmark) shows the same blank message, with no menu and no way to get anywhere.

## What changes
1. **Smart landing page after sign-in.** Instead of always using the Dashboard, the app picks the first page the person is allowed to see, in menu order:
   - Lead Tracker: Dashboard, then Leads, Outreach Tracker, Ledger, Archive, Import/Export.
   - CRM: Dashboard/Records, then Pipeline, Follow-ups, Revenue.
   - If they have both modules, their saved default module is tried first.
   - Example: your member with Leads ticked but Dashboard unticked goes straight to Leads.
2. **Blocked links redirect quietly.** If someone opens a page they don't have access to (for example app.buzzspear.co/lt/dashboard), they're moved to their first allowed page instead of seeing the blank message. A small notice says "You don't have access to that page".
3. **Logo, module tabs and keyboard shortcuts** (Ctrl/Cmd + 1/2, "G D") use the same smart landing page, so they never lead to a blocked page.
4. **No access at all:** only someone with zero allowed pages sees a clear message page with a Sign out button, inside the normal app look.

Menus already hide pages people can't open, so nothing changes there. No permissions or saved data change.

## Technical details
- Add `firstAllowedPath(can, preferredModule)` in `src/lib/permissions.ts`, built from the same nav list (`to` + `perm`) used by the sidebar so the two never drift; unit test it (Dashboard unticked + Leads ticked → `/lt/leads`; nothing allowed → null).
- `src/routes/modules.tsx`: replace hard-coded `/lt/dashboard` / `/crm/records` with `firstAllowedPath`.
- `src/components/app-shell.tsx` (line ~3056): when `perm` is denied, `navigate({ to: firstAllowedPath(...), replace: true })` plus a toast; render the no-access state only when it returns null. Update logo/tab links, `GO_TO` and Ctrl+1/2 to use it.
- `settings.tsx` back link uses the same helper.
- Verify in the browser as a limited member: sign-in lands on Leads; visiting `/lt/dashboard` redirects to Leads.
