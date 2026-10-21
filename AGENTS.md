<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Google Sheet backup logic lives only in src/lib/sheet-backup.server.ts (config in app_settings key google_sheet_backup); server fns and the hourly /api/public/jobs/sheet-backup route call it, so manual and automatic backups never diverge.
- Tracker change-to-query mappings live in src/lib/tracker-updates.ts and are shared by save actions and realtime subscriptions so every affected view refreshes consistently.
- Private profile pictures are stored as avatars/<user-id>/<file> and rendered through ProfileImage with expiring signed URLs, so uploads never require public storage.
- Outreach activity windows are resolved in src/lib/activity-rates.ts from each flag's timestamp; creation dates never substitute for missing event dates.
- Shared outreach rate numerators and denominators live in src/lib/outreach-metrics.ts and are tested independently of rendering.
- Task owner selectors normalize empty and Unassigned values with taskAssignee before writes, because assignee_id accepts UUIDs or null only.
- Follow-up deletion/renumbering and selecting a primary contact use SECURITY INVOKER database functions so each change is atomic and respects workspace RLS.
- Full CSV exports read ordered pages with collectExportPages so the Data API row cap cannot silently truncate the file.
- CRM auto-push rules live only in the SQL function crm_auto_push (called from lead triggers), so imports, edits and stage changes all follow the same rule.
- New sign-ups get an access_requests row instead of a workspace; only the owner approves (approve_access) or removes (removeAccessRequest server fn bans the account), because the app is team-only.
- Paired outreach checkbox controls share outreachCheckChange; unticking clears the flag/date without browser confirmation so corrections work inside embedded previews.
- Outreach prerequisites live in src/lib/outreach-order.ts and are enforced by a final database validation trigger; existing inconsistent ticks remain clearable without inventing missing activity.
- Stage automation infers outreach only when no outreach flag in that family changed; email viewed remains independent of replied to prevent undoing corrections or inventing activity.
