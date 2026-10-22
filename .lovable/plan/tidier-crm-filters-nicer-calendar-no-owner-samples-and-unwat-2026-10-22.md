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

## 4. "Loom" box renamed "Value"
The Loom box on the lead page becomes "Value". Nothing in it is removed:
- **Loom:** link, Loom sent, Loom watched and Watch % stay exactly as they are now.
- **Sample:** a new link box. No tick. Once a link is pasted, the box turns green so you know a sample was made.
- **Content audit:** a new link box, green in the same way once filled.
The side panel shows the Sample and Content audit links too.

## 5. Filters for Value
- CRM Records and Leads filters get "Sample sent" (Yes/No) and "Content audit sent" (Yes/No), based on whether a link was added.
- "Loom watched" (Yes/No) is added next to "Loom sent", so "Loom sent: Yes + Loom watched: No" lists everyone who hasn't watched yet.
- No new pages or menu sections are added, and no existing section is removed.

## Technical details
- Migration: add nullable `sample_url text` and `content_audit_url text` to `leads` (no ticks, no data changes).
- Add both columns to CSV export, Google Sheet backup headers and importer field list.
- "Sent" filters = link is not empty.
- DealPeek date uses shadcn Popover + Calendar (`pointer-events-auto`).
