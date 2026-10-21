/** Prerequisites prevent new activity; existing ticks always remain clearable. */
export const OUTREACH_PREREQUISITES: Record<string, readonly string[]> = {
  email_viewed: ["email_sent"],
  email_replied: ["email_sent"],
  linkedin_sent: ["linkedin_connection_sent"],
  linkedin_replied: ["linkedin_connection_sent", "linkedin_sent"],
  instagram_replied: ["instagram_sent"],
};

export function canCheckOutreach(lead: Record<string, unknown>, field: string): boolean {
  return (OUTREACH_PREREQUISITES[field] ?? []).every((required) => lead[required] === true);
}

export function outreachDisabled(lead: Record<string, unknown>, field: string, canEdit: boolean): boolean {
  return !canEdit || (lead[field] !== true && !canCheckOutreach(lead, field));
}