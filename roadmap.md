# Buzzspear Tracker roadmap

- [x] Enforce email, LinkedIn and Instagram sending prerequisites across lead edits; signed-in select/clear/reload and invalid-write tests passed; temporary lead removed
- [x] Diagnose slow navigation: capacity healthy; realtime now refreshes only affected views instead of all cached queries; local full loads measured, published speed not verified

- [x] Fix outreach tick corrections; all ten LinkedIn, Instagram, email and Loom ticks passed signed-in select/clear/reload checks using a temporary lead

- [x] Run signed-in lead, contact, follow-up, task, CRM and archive workflows using temporary records; remove test records
- [x] Review import/export, all 16 Settings sections, Google Sheet status and numerical workflows; fix confirmed defects
- [x] Run 23 regression tests, verify 18 screens and report tested flows and blocked checks
- [ ] Verify fresh Google sign-in and invitation acceptance: requires external account participation; existing signed-in session was tested
- [ ] Verify a new Google Sheet push/pull end-to-end: deferred to avoid overwriting the live backup or importing live data during QA; hourly backup status shows success

- [x] Repair Add lead and verify creation, editing and list updates while signed in
- [x] Correct live refresh across lead and CRM screens; review related buttons
- [x] Double-check saved lead data and other visible screens; report confirmed unfinished features requiring a decision
- [x] Finish profile-picture uploads as requested and verify upload, reload and removal
- [x] Check payment options: none are accessible; keep this internal-team app payment-free
- [x] Fix Settings section refresh from the recording and verify all 16 Settings sections on reload
- [x] Audit percentages, switch outreach windows to dated activity, pass 20 regression tests and compare visible fractions

- [x] Database schema, RLS, permissions, triggers, seed config (stages, channels, countries, targets)
- [x] Email + password auth, Google sign in, pending approval screen, first user becomes owner
- [x] Design tokens, app shell, sidebar, top bar, theme toggle, command palette, shortcut layer
- [x] Module picker
- [x] Lead Tracker pages (dashboard, leads, lead detail, outreach, ledger, archive, import/export)
- [x] CRM pages (records, record detail, pipeline, follow-ups, revenue)
- [x] Settings page (nine cards incl. users and access)
- [x] Typecheck clean; sign-in page verified in browser (authenticated pages need the first real account)

- [x] Email box: separate ticks, sentiment popup, stage follows email, ask channel/sender
- [x] Different color per sender account
- [x] Replied (non-negative) / Call Booked / Proposal Sent leads auto-enter CRM
- [x] CRM leads hidden from Leads list and channel tabs
- [x] Team-only sign-in with owner approval; welcome/invite/create-workspace removed
- [x] Email + password sign-in on /auth beside Google; password set for shourya@buzzspear.com
- [x] Hide Activity from both sidebars and the command palette, keep both pages reachable by address; guided tour no longer points at Activity or the removed invoice page
