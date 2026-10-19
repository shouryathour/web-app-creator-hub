# Find a lead by pasting any email

## Today
- The top search bar only matches company name and lead number.
- The Leads page search matches company, primary contact and lead number.
- Neither checks the emails saved on each person (main email or extra emails), so pasting a person's email often finds nothing.

## What changes
1. Paste any email into the top search bar (or the Leads page search) and it finds the lead, whichever person on the lead has that email, including extra emails and archived leads.
2. Results show the company, lead number, and which person matched (for example "Matched: john@acme.com, John Smith"). Archived leads are labelled "Archived".
3. If nothing matches, the search says clearly: "No lead with this email is in the tracker."
4. Matching ignores capital letters, extra spaces and a leading "mailto:".
5. LinkedIn, Instagram and website links pasted into the search also find the lead, using the same matching as the duplicate check.

## Technical details
- Add `findLeadsBySearch(q)` in a shared module: if `q` looks like an email/link, reuse `findDuplicateLead`-style lookups across `leads.primary_contact`, `lead_contacts.email`, `lead_contacts.emails` (jsonb contains), and link columns; otherwise current text search.
- Use it in the global command search (app-shell) and in the Leads list query (search adds matching lead ids via `id.in.(...)`).
- Escape `%`/`_` in user input.
- Add tests for email normalization/matching in `tests/`.
