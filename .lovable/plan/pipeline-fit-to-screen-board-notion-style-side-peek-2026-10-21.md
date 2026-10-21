# Pipeline: fit-to-screen board + Notion-style side peek

## 1. See every stage without scrolling sideways
- **Fit-to-screen board (default):** columns shrink and stretch to fill the screen width instead of a fixed 280px each. On an ultrawide monitor all stages show at once; on smaller screens they shrink down to a readable minimum before scrolling starts.
- **Compact cards toggle:** a "Compact" switch above the board makes cards one line (company name + value), so far more deals fit in each column. Your choice is remembered.
- **New List view:** a "Board / List" switch. List view shows every deal in one table, grouped by stage (collapsible groups with count and total), with columns: Company, Stage, Priority, Value, Last outreach, Next follow-up, Updated. Click a column to sort.
- Hiding stages (the eye icon) keeps working in both views.

## 2. Quick peek panel on click (like Notion)
- A single click on a deal card (or list row) opens a narrow panel sliding in from the right. The board stays visible behind it; no new page.
- Panel shows the basics:
  - Company name, stage, priority, deal value / monthly amount
  - Primary contact (name, email, LinkedIn) with copy buttons
  - Channel and sender account
  - Last outreach date, email sent / viewed / replied dates, reply mood
  - Next follow-up date and how many follow-ups done
  - Booking date and close date if set
  - Open to-dos (with tick to complete) and the last few activity entries
- Quick edits in the panel: change stage (won/lost still ask the same questions as today), priority, next follow-up date.
- "Open full page" button for everything else; Esc or clicking outside closes it. Pressing up/down moves to the next/previous deal.
- Dragging cards between stages still works as now.

## Technical details
- `src/routes/crm.pipeline.tsx`: columns use `flex-1 min-w-[200px]` grid; add view/compact toggles persisted in localStorage; add list view component.
- New `src/components/crm/DealPeek.tsx` using the existing Sheet component; loads record + lead + contacts + follow-ups + tasks with queries keyed so `invalidateTrackerQueries` refreshes it.
- Stage changes in the panel reuse the pipeline's won/lost dialogs and `move` mutation.
- Last outreach = latest of the lead's sent/follow-up timestamps (no invented dates).
