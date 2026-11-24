# Leads list: bulk "Verify" button + simpler table

## 1. "Mark verified" in the selection bar
- When one or more leads are ticked, the bar at the top (Change stage, Set follow-up, Push to CRM, Archive...) gets a new **Mark verified** button.
- One click marks every selected lead as verified (same as the tick on the lead's full page: saves who verified it and when). Their numbers turn green straight away.
- A matching **Mark unverified** option lets you undo a mistake.
- Shows a short confirmation like "3 leads verified".

## 2. Fewer columns in the Leads table
The table will only show:
- Number
- Company
- Stage
- Last contacted
- Follow-up

Hidden from the table only (not deleted): Contact, Country, Status, Channel, Added, Activity. That information stays on each lead's page and side panel, in filters, search, exports, imports and the Google Sheet backup. No leads or data change.

## Technical details
- `src/routes/lt.leads.index.tsx`: add `bulkVerify(true|false)` updating `leads.verified`, `verified_at`, `verified_by` for selected ids, then refresh via the shared tracker-update helper; remove the six header/cell pairs from the table view only (Cards/Columns/Calendar views untouched).
