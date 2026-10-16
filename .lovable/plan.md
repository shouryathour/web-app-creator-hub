# Automatic Google Sheet backup + Settings cleanup

## What you will get
1. **Google Sheet page in Settings** that shows your sheet live, right inside the app:
   - Which Google account is connected and a "Change account" button.
   - The backup sheet itself displayed inside the page (scroll and read it there), plus an "Open in Google Sheets" button.
   - Last backup time, how many leads were copied, and any error in plain words.
   - A "Sync now" button for an instant update.
   - A choice of how often it updates automatically: **every hour** or **once a day**.
2. **Automatic backup**: the app copies every lead into your one backup sheet on that schedule, without you pressing anything. It always updates the same sheet. It never creates a new one.
3. **Option to use your own existing sheet**: paste a Google Sheet link and the backup writes into that sheet instead.
4. **Removed from Settings**: Invoice templates, Outreach templates, CRM currency. Totals keep the currency they use now.

## Notes
- The backup goes one way only: from the app to the sheet. Edits made in the sheet do not come back into the app.
- The automatic run starts a few seconds after the hour, not on the exact second.
- The backup uses the Google account connected to the app (your own). Changing the account opens the normal Google connect screen.

## Technical details
- New `src/routes/api/public/jobs/sheet-backup.ts` POST route, guarded by `authenticateCronRequest`, that runs the shared sync logic for each workspace with backup enabled and saves the last-run status in `app_settings`.
- Move the sync body out of `syncLeadsToSheet` into a server-only helper used by the manual button and the scheduled route (admin client loaded inside the handler after auth).
- One managed HTTP schedule set to hourly (`0 * * * *`); the handler skips workspaces set to daily unless 24h have passed since their last run.
- `google_sheet_backup` setting gains `frequency`, `lastSyncedAt`, `lastRowCount`, `lastError`, and an optional user-provided `spreadsheetId`.
- `GoogleSheetCard` is rebuilt: embedded `<iframe>` of the sheet URL (`/edit?rm=minimal`), status, frequency picker, link field, account change via the connector reconnect flow.
- `settings.tsx`: remove the `invoice_templates`, `outreach_templates`, `crm_currency` sections and their imports. Component files stay in place.
