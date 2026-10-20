# Replied, Call Booked and Proposal Sent leads go to the CRM automatically

## What's wrong today
A lead only goes to the CRM when its reply mood is **Positive** and a reply tick changes at the same moment. So these leads never arrive:
- Replied leads where no mood has been picked yet (3 right now).
- Leads moved to **Call Booked** or **Proposal Sent**.
- Leads marked positive without a reply tick (1 right now).

## New rule
A lead goes into the CRM straight away when any of these happens:
- It is marked as replied (email, LinkedIn or Instagram) and the mood is **Positive**, **Neutral**, or not picked yet.
- Its mood is set to Positive or Neutral.
- Its stage becomes **Replied**, **Call Booked** or **Proposal Sent**.

Negative replies stay out, unless the lead is later marked Not Interested (that still goes to the Lost column, as now). **Client** keeps its current popup and Won handling.

In the CRM pipeline, Call Booked leads land in the Call Booked column and Proposal Sent leads in the Proposal Sent column. Other new arrivals land in New Reply. Leads already further along are never moved back.

## Existing leads
Every current lead that matches the new rule is added to the CRM now (about 4 leads). Nothing already in the CRM is removed.

## Technical notes
- Migration replacing the CRM push block in `leads_after_change` and `leads_log_insert_flags`: condition = (any replied flag true and sentiment null/positive/neutral) or stage name in replied/call booked/proposal sent; call `ensure_crm_record`, then set the CRM stage by matching name (Call Booked / Proposal Sent) only when the target `order_index` is higher than the current one.
- One-off backfill via the data tool calling `ensure_crm_record` for matching non-archived leads without a record.
- Verify by ticking Replied with no mood and moving a lead to Call Booked in the browser, then checking the CRM pipeline.
