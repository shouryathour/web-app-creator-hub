# Google Sheet backup, matching your other tracker + Settings cleanup

## What you will get (same as your screenshots)

**1. Google Sheet section**
- "Connected as shourya@buzzspear.com" with a tick.
- Line: "Your leads are backed up to a sheet in your own Google Drive. Last sync: ..."
- Buttons: **Open Google Sheet** and **Disconnect** (Disconnect turns into **Connect Google** so you can connect the account you want).
- Below that, the sheet itself shows live inside the page, so you can see it without leaving the app.

**2. Automatic backup section**
- "Hourly or daily backups to your Google Sheet."
- Tick box **Automatic backup enabled**, a choice **Every hour / Every day**, and **Back up now**.
- "Last automatic backup: ..." and "Status: Backup completed successfully." (or the problem in plain words).
- Always updates the same one sheet. It never makes a new one.

**3. Import / Export section**
- Google Sheets row: **Open Sheet**, **Push** (send all leads to the sheet now), **Pull** (bring edits made in the sheet back into the app, matched by company name, with a preview before anything changes).
- Export row: **Export all leads (CSV)** and **Export CRM records (CSV)**.
- Import leads: the steps 1 Upload > 2 Map columns > 3 Preview > 4 Confirm > 5 Result, with two boxes side by side: **Upload a file** (CSV or Excel) and **Paste Google Sheet link** with **Import from Google Sheet**. This uses your existing smart column matching.

**4. Removed from Settings**: Invoice templates, Outreach templates, CRM currency. Totals keep the currency they use now.

## Notes
- Hourly backups start a few seconds after the hour, not on the exact second.
- Pull never deletes leads; it only updates or adds, and shows you the changes first.

## Technical details
- Server-only sync helper shared by the manual button and a new `/api/public/jobs/sheet-backup` route guarded by `authenticateCronRequest`; one hourly managed schedule, daily workspaces skipped until 24h passed.
- `google_sheet_backup` setting gains `enabled`, `frequency`, `lastSyncedAt`, `lastStatus`, `lastError`, `connectedEmail`.
- Connected email read via the Sheets connection (Drive `about` / token info); Disconnect/Connect use the connector reconnect flow.
- Pull reads the backup sheet via the gateway, feeds rows into the existing importer's preview/duplicate logic.
- Google Sheet link import: read the pasted sheet via the gateway, pass rows into the existing mapping steps.
- CSV exports for leads and crm_records.
- `settings.tsx`: new sections `google_sheet`, `auto_backup`, `import_export`; remove `invoice_templates`, `outreach_templates`, `crm_currency` sections and imports. Component files stay.
