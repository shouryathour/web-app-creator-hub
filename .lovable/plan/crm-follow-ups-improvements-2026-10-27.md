# CRM Follow-ups improvements

## 1. Deals with no follow-up date show in Overdue
- CRM → Follow-ups currently only lists deals that have a next follow-up date.
- Open deals (not Won/Lost) with no date will appear at the top of Overdue, marked "No follow-up date".
- Won and Lost deals stay out.

## 2. Side panel on click
- One click on a company name opens the same right-hand side panel used in Pipeline and Records (stage, contact, email dates, activity, next follow-up).
- Ctrl/Cmd-click, or "Open full page" in the panel, opens the full record (new tab with Ctrl/Cmd).

## 3. New "Log" pop-up
Replace the Channel / Inbound / Summary boxes with three date questions:
- When did you follow up? (date, defaults to today)
- Last contact on (date, defaults to today)
- Next follow-up (date, required — quick +3 / +7 / +14 day buttons)

Saving records the follow-up in the deal's history, updates last contact and sets the new next follow-up date, so the deal moves out of Overdue right away. Snooze stays.

## Technical details
- `src/routes/crm.followups.tsx`: query open records (join stage, exclude is_won/is_lost) including null `next_followup_date`; null-dated rows go into Overdue.
- Reuse `DealPeek` with selected-id state; `onClick` opens peek, meta-click opens `/crm/records/$id` in new tab.
- Log dialog: insert `crm_contact_log` row (contacted date from answer, no channel/direction/summary inputs) and update `crm_records` `last_contact_at`/`next_followup_date` (confirm column names when building); invalidate via `invalidateTrackerQueries`.
