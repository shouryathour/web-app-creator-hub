# Cleaner side panel, stages, money box and one calendar everywhere

## What changes

1. **Remove the status picker** (new / in_progress / on_hold / won / lost) from the lead page. The stage already says this. Saved values stay stored but are hidden.
2. **Two new stages** in the Lead Tracker stage list: **No Response** and **Call No-Show**. They are added after the existing ones (Not Interested, Not A Priority and the rest). No leads move.
3. **Money box only for clients.** The Money section on the CRM record shows only when the stage is Client or Closed/Won. Saved amounts are never deleted.
4. **Side panel buttons.** The bottom of the side panel gets two buttons, **Open in Lead Tracker** and **Open full page**. Both open in a new tab.
5. **Click setting.** A new choice in Settings sets what one click on a lead does: open the side panel (default), open Lead Tracker in a new tab, or open the full page in a new tab. Ctrl/Cmd-click still opens a new tab.
6. **Last outreach is editable.** In the side panel, Last outreach becomes a date button that opens the new calendar. Picking a date saves it as the lead's last contact date.
7. **Hide empty rows in the side panel.** Rows with nothing filled in (Call booked, Closed, Viewed, Name, LinkedIn and so on) are not shown, and neither is the empty "Open to-dos" block. A section with no filled rows is hidden completely.
8. **New calendar everywhere.** Every old browser date box gets the same popup calendar used in the side panel. That covers the Loom watched dialog, "When did you close this client?", the reply dialog, follow-ups, filters, tables, lead page dates and account settings.

## Technical details
- Add one `DateField` component (Popover + shadcn Calendar, value as `yyyy-MM-dd`) and replace every `type="date"` input in: confirm-dialog (promptDate + Loom dialog), RepliedDialog, lt.leads.$id, crm.records.index, crm.followups, LeadFilterBar, FollowupsCard, AccountsCard, kit, tasks.
- Inside dialogs, the popover content gets `pointer-events-auto`.
- Make `Row` in DealPeek and LeadPeek skip rendering when the value is empty. Last outreach writes to `leads.last_contacted_at` and refreshes queries through invalidateTrackerQueries.
- Store the click preference per user in local storage, using one shared `openLead` helper that all lead-list clicks call.
- Add the two stages as rows in the lead stage lookup and map them in stage colors. CRM auto-push leaves them out of the CRM.
- Render DealMoney only when `stage.is_won` or the stage name is Client/Closed.
