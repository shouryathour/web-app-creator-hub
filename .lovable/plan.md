# Date order warnings + Loom watched pop-up

## What you'll see
1. **Red warning when dates are out of order** (on the lead page, Email, LinkedIn, Instagram and Loom boxes). The date still saves, but a red note appears under the wrong date, e.g. "Watched 28 Aug is before Loom was sent 23 Dec — check the dates."
   - Email: Viewed and Replied can't be before Sent. (Your screenshot: Viewed 28 Oct after Replied 28 Aug is fine to allow, but Replied before Viewed gets a softer note.)
   - Loom: Watched can't be before Sent.
   - LinkedIn: Message can't be before the connection request; Replied can't be before the message.
   - Instagram: Replied can't be before Sent.
2. **Loom watched pop-up.** Ticking "Loom watched" opens a small box asking:
   - Which date they watched it (defaults to today, can't pick before the send date without a warning).
   - How much they watched, as a percentage (0–100, quick buttons 25 / 50 / 75 / 100).
   - Save stores both; Cancel leaves it unticked.
3. A small warning icon on the lead in the Leads list when any of its dates are out of order, so you can find and fix old ones.

## Technical details
- New `src/lib/outreach-dates.ts`: `dateOrderIssues(lead)` using the same prerequisite pairs as `outreach-order.ts`; returns field → message. Unit tests in `tests/outreach-dates.test.ts` (watched before sent flagged, same day OK, missing dates ignored).
- `CheckDate` gets an optional `warning` prop rendered in red text.
- Lead page Loom card (`lt.leads.$id.tsx` ~line 2160): intercept tick → Dialog with date + percent, then one save of `loom_watched`, `loom_watched_at`, `loom_watch_percent`.
- Warnings only — no database blocking, so imported data with odd dates stays editable.
