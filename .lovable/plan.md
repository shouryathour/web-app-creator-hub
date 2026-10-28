# Cleanup: to-dos, notes, contact log, and nicer pop-ups

## 1. Remove all to-do sections
- Remove "To-dos" from the Lead Tracker and CRM menus.
- Remove the To-dos card from the lead page and the CRM deal page.
- Remove the to-dos list from the side panel (peek) and dashboards where shown.
- Existing to-do data is left untouched in the database (nothing is deleted); the old addresses simply send you to the dashboard.

## 2. One "Notes" box instead of Research + Additional
- Lead page: replace "Research notes" and "Additional notes" with a single **Notes** box.
- Move existing text: 4 leads have Additional notes filled in, none have Research notes, so those 4 notes are copied into Notes. Nothing is lost.
- CRM deal page: remove the read-only "Research / Additional notes" block; keep the existing Notes box.
- Import, CSV export and Google Sheet backup use the single Notes column (old "Additional notes" columns in imports map into Notes).

## 3. Remove "Contact log" from the CRM deal page
- Remove the Contact log card (as circled in your screenshot). Past entries stay stored; the Follow-ups page "Log" button keeps working.

## 4. Replace browser pop-ups with in-app dialogs
- All ~30 browser "app.buzzspear.co says…" confirmations (delete follow-up, clear follow-ups, delete lead, delete tag/stage/template/sender, untick, push to CRM, etc.) become a centered in-app dialog in the app's style: clear title, short explanation, Cancel and a red "Delete" (or matching action) button, keyboard Enter/Escape support.
- Restyle the existing in-app dialogs (Loom watched, reply details, log follow-up, close date) to match: consistent spacing, title + description, aligned buttons.

## Technical details
- New `useConfirm()` hook + `<ConfirmProvider>` mounted in root, built on shadcn AlertDialog, returning `Promise<boolean>`; replace every `window.confirm` (rg list) with `await confirm({...})`.
- Migration: `update leads set research_notes = additional_notes where coalesce(research_notes,'')='' and coalesce(additional_notes,'')<>''` (merge with blank line if both ever set); UI uses `research_notes` as the Notes field; `additional_notes` column kept but unused.
- Remove `LeadTasksCard` and `ContactLogCard` usages; hide todos nav items; `/lt/todos` and `/crm/todos` redirect to dashboards.
- Update importFields/data-fields/buildRow/sheet-backup mappings; update AGENTS.md and memory.
