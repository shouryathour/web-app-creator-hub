export const ACTIVITY_FLAGS = ["email_sent", "email_viewed", "email_replied", "instagram_sent", "instagram_replied", "linkedin_connection_sent", "linkedin_sent", "linkedin_replied", "loom_sent", "loom_watched", "meeting_booked", "client_closed"] as const;

export function activityInRange(leads: Record<string, any>[], from: string, to: string) {
  const low = new Date(`${from}T00:00:00`).getTime();
  const high = new Date(`${to}T23:59:59.999`).getTime();
  return leads.map((lead) => {
    const row = { ...lead };
    for (const flag of ACTIVITY_FLAGS) {
      const time = lead[`${flag}_at`] ? new Date(lead[`${flag}_at`]).getTime() : NaN;
      row[flag] = Boolean(lead[flag]) && time >= low && time <= high;
    }
    if (!row.email_replied && !row.linkedin_replied && !row.instagram_replied) row.reply_channel_id = null;
    const contact = lead.last_contacted_at ? new Date(lead.last_contacted_at).getTime() : NaN;
    if (!(contact >= low && contact <= high)) row.contacted_channel_id = null;
    return row;
  }).filter((row) => ACTIVITY_FLAGS.some((flag) => row[flag]) || row.contacted_channel_id || row.reply_channel_id);
}