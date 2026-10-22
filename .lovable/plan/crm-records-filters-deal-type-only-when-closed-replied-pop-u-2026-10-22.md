# CRM Records: filters, deal type only when closed, Replied pop-up

No leads or records are added or removed.

## 1. Filters on CRM Records (same as Leads)
Add the collapsible "Filters" box from the Leads page to CRM → Records:
- Search (company, contact, code), Stage, Country, Channel, Sender account, Tag, Priority, Owner
- Date added range, Has replied, Loom sent
- Sort by (last activity / date added / value / next follow-up) and Newest/Oldest
- Clear all; choices remembered after refresh
The existing Deal type dropdown at the top moves into this box.

## 2. Deal type only on closed deals
- On a record's Deal box and in the side panel, Deal type and the MRR field show only when the stage is a closed (Won/Client) stage. Open stages like Positive reply show just Stage, Priority, Deal value.
- When shown, Deal type offers only "Monthly retainer (MRR)"; you enter the monthly amount. One-time is hidden for now.
- Records table: the Deal type column shows a blank dash for open deals.
- Existing records: open deals keep their saved value behind the scenes (the field can't be empty), but it's never displayed or counted. Closed deals are left as they are so revenue numbers don't change.

## 3. "Replied" pop-up in CRM
When a record's stage is changed to Replied (record page, side panel or Pipeline drag), a side pop-up asks:
- Platform (Email preselected; LinkedIn / Instagram)
- When did you send it? (date)
- When did they view it? (date, email only)
- When did they reply? (date)
Saving ticks the matching sent/viewed/replied boxes with those dates, following the existing sending-order rules and the date-order warnings. Cancel leaves the stage unchanged.

## Technical details
- Reuse LeadFilters/LeadFilterBar logic in src/routes/crm.records.index.tsx; filter via joined leads fields; persist with useStoredState.
- `isClosedStage(stage)` = stage.is_won; gate deal-type UI in crm.records.$id.tsx, DealPeek.tsx, records table.
- Replied dialog shared component used by crm.records.$id.tsx, DealPeek, crm.pipeline.tsx; writes leads flags/_at fields then stage; invalidate via tracker-updates.
- No schema change; no data rewrites.
