# Smarter Email box on the lead page

## 1. Each tick works on its own
- Email sent, Email viewed and Email replied can each be ticked by themselves, each with its own date (today by default, changeable).
- Ticking Viewed does not force Sent or Replied; ticking Replied keeps Viewed as it already behaves (reply implies viewed).

## 2. Replied asks for the sentiment
- When Email replied is ticked, a small popup asks: Positive, Negative or Neutral.
- Picking one saves it to the Reply sentiment box. Cancelling leaves the tick on but keeps the "(required)" warning.
- Positive still sends the lead to the CRM; negative/neutral keep it in the Lead Tracker (existing rules).

## 3. The stage at the top follows the Email box
- Email replied ticked: stage moves to **Replied**.
- Only Email sent (or viewed) ticked and the stage is earlier (New, Researching, Email Drafted): stage moves to **Contacted**.
- The stage never moves backwards: a lead already at Call Booked, Proposal Sent, Client, Not Interested or Not A Priority is left alone.

## 4. Ask for channel and sending account
- When Sent, Viewed or Replied is ticked and the lead has no Channel or no Sender account, a popup asks for both (Channel defaults to Email, sender list from Settings).
- You can skip it; the lead still saves, and the fields stay empty.

## 5. A color for each sending email
- Every sender account gets its own color, shown as a colored dot or badge wherever you pick or see it: the Sender account dropdown on the lead, the popup above, the leads list and Settings > Sender accounts.
- Colors are picked automatically so each email looks different; you can change a sender's color in Settings.


## Technical notes
- All in `src/routes/lt.leads.$id.tsx`: `EmailCard` gets a combined handler that builds one patch (flag + date, plus `stage_id` for the Replied/Contacted stage looked up by name on the lead board, only when the current stage's `order_index` is lower), then opens `SentimentDialog` and/or `ChannelSenderDialog` before calling `onSave`.
- Channel dialog writes `channel_id`, `contacted_channel_id` (and `reply_channel_id` on reply) and `sender_account_id`.
- Existing database stage automation stays; the patch sets flags already, so no double events.
- Add a small test for the "stage never moves backwards" rule in a helper module.
- Sender colors: add a `color` column to `sender_accounts` (migration, default assigned from a fixed palette by order), a color picker in the Accounts settings card, and a `SenderBadge` used in sender selects and lists. Roadmap gets this item when building.
