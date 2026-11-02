# Plan: AI chat, simpler Leads menu, prospect numbers

No leads, contacts, follow-ups or CRM records will be deleted or changed by any step below.

## 1. Leads menu opens All Leads directly
- Remove the Instagram / LinkedIn / Email sub-items and the dropdown under Leads.
- Clicking "Leads" opens All Leads straight away.
- Remove those three pages; any old link to them goes to All Leads instead.
- All Instagram, LinkedIn and email leads stay in All Leads, untouched. The channel filter in All Leads still lets you narrow by platform.

## 2. Prospect numbering
- Add a "#" column in All Leads showing Prospect 1, 2, 3... numbered by date added (oldest = 1).
- Shown on the lead side panel and full page too ("Prospect 12").
- This is a display number only; the existing LEAD-0xxx codes stay as they are, so nothing in your Sheet backup breaks.

## 3. Dashboard
- Keep outreach rates (sent, Loom view rate, reply rate, etc.) counting every active lead, including ones that moved to CRM, so numbers never drop when a lead moves. (This is how it works today; I will double-check it stays that way.)
- Add a small "In CRM" block on the Lead Tracker dashboard: how many moved to CRM, replied positively, watched Loom, booked a call, closed.

## 4. AI chat ("Ask AI")
- An "Ask AI" item in the Lead Tracker menu (below Import / Export) and in CRM (below Import). Both open the same chat, so conversations are shared.
- Saved conversations: a list of past chats, new-chat button, each chat has its own link.
- Model picker next to the message box: **Haiku** (normal, cheap) and **Sonnet** (hard questions). Default Haiku. If a question looks complex (comparisons across periods, multi-step analysis), the chat suggests switching to Sonnet; you decide.
- Uses your saved Anthropic key.
- The AI reads the same data the Google Sheet backup contains (leads, contacts, outreach ticks and dates, follow-ups, CRM deals, money, stages) through exact counting tools, so numbers like "samples sent last week" or "reply rate this month vs last" are calculated, not guessed. It only sees what the signed-in person is allowed to see.
- Read-only for now: it answers questions, it does not edit or delete anything.
- Cost: each reply shows tokens and dollar cost; a side panel shows the cost of the current conversation, and Settings gets an "AI usage" page with cost per day and per conversation.
- Kept fast: the chat page loads separately, so the rest of the app is not slowed down.

## Questions still open (I will confirm before building if you want)
- "Sonnet 5.5 / Haiku 5.5" are not real names; I will use the newest Sonnet and Haiku your Anthropic key can access and show their real names in the picker.
- Who can use Ask AI: everyone, or only people you tick in permissions? Default: a new "Ask AI" permission, on for you and admins.

## Technical details
- Remove `lt.leads.instagram/linkedin/email.tsx`; add redirect routes to `/lt/leads`; drop `CHANNEL_LEAD_PATHS` sub-nav in `app-shell.tsx`.
- Prospect number via `row_number() over (partition by workspace order by date_added, created_at)` in a view/RPC; no column writes.
- New tables `ai_threads`, `ai_messages` (workspace + user scoped, RLS, grants) storing UIMessage parts and token usage/cost per assistant message.
- Server route `/api/ai/chat` streaming with `@ai-sdk/anthropic` using `ANTHROPIC_API_KEY`, tools running as the caller (RLS) reusing `activity-rates.ts` / `outreach-metrics.ts`.
- Routes `/ai` and `/ai/$threadId`, AI Elements UI, markdown rendering.
