# Tidier CRM filters, nicer calendar, no owner, Samples and Unwatched Looms

No leads or records are added or removed.

## 1. Fewer filters on CRM Records
Keep only: Search, Stage, Priority, Deal type, Country, Channel, Sender account, Tag, Date added, Loom sent, Loom watched, Sample sent.
Remove: Has replied (everyone in CRM has replied), Owner, the close-month box, Min value and Max value.
Laid out in two neat rows.

## 2. Owner removed
- Owner column and Owner filter are removed from CRM Records.
- The Owner pick on the CRM revenue filter and the record page is hidden too.
- Saved owner names stay in the database (nothing deleted), they're just not shown.

## 3. Better calendar in the side panel
The "Next follow-up" date in the side panel opens the same calendar the rest of the app uses (month and year dropdowns, Today highlighted), not the browser's plain one.

## 4. New "Sample" box on every lead
On the lead page, below the Loom box, a new Sample box like the Loom one:
- Sample link
- Sample created (tick + date)
- Sample sent (tick + date; needs Sample created first, like the other sending rules)
Also shown in the side panel. Filters "Sample created" and "Sample sent" are added to the Leads filters and CRM Records filters.

## 5. Two new pages in the left menu (Lead Tracker and CRM, under Activity)
- **Unwatched Looms:** every lead where the Loom was sent but not watched yet, with the sent date and days waiting. One click opens the side panel; you can tick "Loom watched" right there.
- **Samples:** every lead with a sample, showing the link, created date and sent date, with a filter for Created / Sent / Not sent yet.
In Lead Tracker these show leads still in the tracker; in CRM they show CRM leads.

## Technical details
- Migration: add to `leads` nullable/defaulted columns `sample_url text`, `sample_created boolean default false`, `sample_created_at timestamptz`, `sample_sent boolean default false`, `sample_sent_at timestamptz`; extend `validate_outreach_order` so sample_sent needs sample_created; add `sample_sent: ["sample_created"]` to OUTREACH_PREREQUISITES and test.
- Add sample columns to CSV export, Google Sheet backup headers and importer field list.
- New routes `lt.looms.tsx`, `lt.samples.tsx`, `crm.looms.tsx`, `crm.samples.tsx` sharing one component, filtered by `pushed_to_crm`.
- DealPeek date uses shadcn Popover + Calendar (`pointer-events-auto`).
