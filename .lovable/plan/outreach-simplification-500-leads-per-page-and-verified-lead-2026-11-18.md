# Outreach simplification, 500 leads per page, and "Verified" leads

Nothing is deleted: no leads, outreach history, channels or counts are removed. Only screens change.

## 1. Outreach tracker
- Remove the "All channels / Email / LinkedIn / Instagram" switcher at the top.
- Replace it with one simple summary for the chosen period (default Last 30 days):
  - Emails sent
  - Follow-ups sent
  - LinkedIn messages sent
- Keep what you like: daily counts per day, the streak (counted automatically), daily goals and the chart.
- Instagram and other channels stop showing on this page, but their saved history stays.

## 2. Leads list: 500 per page by default
- Leads list opens showing 500 per page. The size picker stays, so you can still pick less.

## 3. Verified leads
- New "Verified" tick on each lead, placed in the lead's full page and side panel next to the people/emails area.
- Ticking it saves who verified it and when; unticking clears it.
- In the Leads list, the number in the "Number" column turns green for verified leads (grey/normal otherwise).
- Add a "Verified / Not verified" filter on the Leads list.
- All existing leads start as Not verified.
- Included in CSV export, import and the Google Sheet backup as a "Verified" column (Yes/blank).

## Technical details
- Migration: add `leads.verified boolean not null default false`, `verified_at timestamptz`, `verified_by uuid`; no data rewritten. Existing per-contact `email_verified` stays as is.
- `lt.outreach.tsx`: drop channel filter segment; compute three totals from `outreach_auto`/`outreach_daily` (email channel kind, follow-ups from `lead_followups.sent_at`, linkedin kind `linkedin_sent`) within the activity-date window per `activity-rates.ts`.
- `lt.leads.index.tsx`: default `pageSize` 500 (remembered choice still wins), green number cell, verified filter.
- Verified toggle in `lt.leads.$id.tsx` and shared side panel; refresh via `tracker-updates.ts`.
- Add `verified` to `sheet-backup.server.ts`, export and importer mapping.
- Small test for the 500 default and verified toggle mapping.
