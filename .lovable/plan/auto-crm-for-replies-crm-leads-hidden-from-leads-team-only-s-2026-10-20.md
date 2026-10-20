# Auto-CRM for replies, CRM leads hidden from Leads, team-only sign-in

## 1. Replied leads go to the CRM straight away
Today a lead only goes to the CRM when its reply mood is Positive *and* a reply tick changes at the same moment. So these never arrive: replies with no mood picked yet, leads moved to Call Booked or Proposal Sent, and positive leads without a reply tick.

New rule: a lead goes into the CRM the moment any of these happens:
- It is marked replied (email, LinkedIn or Instagram) and the mood is **Positive**, **Neutral**, or not picked yet.
- Its mood is set to Positive or Neutral.
- Its stage becomes **Replied**, **Call Booked** or **Proposal Sent**.

Negative replies stay in the Lead Tracker (Not Interested still goes to the Lost column, as now). Client keeps its current popup and Won handling. In the pipeline, Call Booked and Proposal Sent leads land in their matching columns; others in New Reply. Leads are never moved backwards.

Existing leads that match are added now (about 4). Nothing in the CRM is removed.

## 2. CRM leads disappear from the Leads section
- Leads that are in the CRM no longer show in the Leads list, board, and Email/LinkedIn/Instagram tabs. They are worked from the CRM only.
- The Lead Tracker dashboard keeps counting them in its numbers (sent, replies, rates), so your stats don't drop.
- Search still finds them and opens the CRM record.
- Leads that become negative later stay in the CRM (Lost column) rather than reappearing.

## 3. Team-only sign-in, approved by you
- The sign-in page shows only: email + password, or Continue with Google. No workspace name, no "create workspace", no welcome screens.
- A new person who signs in gets no workspace of their own. They see one screen: "Waiting for approval" with a Sign out button. They cannot see or do anything else.
- You get a notification in the app (bell in the top bar, plus a list in Settings → Users): "**name / email** signed in. Let them in or remove?" with **Approve** (choose Admin or Member) and **Remove**.
- Approve adds them to the Buzzspear workspace; Remove deletes the request and blocks the account.
- Only you (owner) see and act on these requests.
- The welcome / onboarding pages, workspace switcher, "create workspace" and invite-link screens are removed. Existing team members are unaffected.

## Technical notes
- Migration: rewrite the CRM push block in `leads_after_change` and `leads_log_insert_flags` (replied flag with sentiment null/positive/neutral, or stage name replied/call booked/proposal sent → `ensure_crm_record`, then forward-only CRM stage by name). Backfill via data tool.
- Leads list/board/channel tabs filter `pushed_to_crm = false`; dashboard metrics queries unchanged. Search hits with a CRM record link to `/crm/records/$id`.
- `handle_new_user` stops calling `make_workspace`; new table `access_requests` (user_id, email, name, status, created_at) with grants + RLS (insert own via trigger, owner-only read/update). Security-definer `approve_access(_user, _role)` / `reject_access(_user)` checked with `is_owner()`; reject bans the auth user via a server function using the admin client after an owner check.
- Revoke `create_workspace` from authenticated; remove `welcome.tsx`, `invite.$token.tsx`, workspace switcher, and onboarding redirects; users without a workspace are routed to a `pending` screen.
- Realtime on `access_requests` drives the owner's bell badge.
- Verify: tick Replied with no mood and move a lead to Call Booked, confirm it leaves Leads and appears in the pipeline; sign in a test account and approve it.
