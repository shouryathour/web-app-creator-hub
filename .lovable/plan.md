# Warn when a link is in the wrong box

When a link is pasted into a box meant for a different site, keep it saved but show a red warning under the box, e.g. "This is a LinkedIn link, not a YouTube link."

## Boxes checked
- Lead page: Website, Company LinkedIn, Instagram, YouTube
- Each person: LinkedIn, Instagram, Email
- Company LinkedIn also warns when a personal profile (linkedin.com/in/...) is pasted: "This is a personal LinkedIn profile, not a company page."

## Behaviour
- Nothing is blocked or removed; the link still saves.
- Red border plus a short red message under the box, which clears once the link matches.
- The Website box warns when a LinkedIn, Instagram or YouTube link is pasted there.

## Technical details
- New `src/lib/link-kind.ts`: `detectLinkSite(url)` returns linkedin-person / linkedin-company / instagram / youtube / email / website, and `linkMismatch(expected, value)` returns a message or null.
- Use it in the lead page social fields (`lt.leads.$id.tsx`) and in the People card fields.
- Add `tests/link-kind.test.ts` covering: LinkedIn company in YouTube box warns, YouTube in YouTube box is fine, personal profile in Company LinkedIn warns.
