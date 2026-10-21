/** A tick and its date are one value; clearing a tick always clears its date. */
export function outreachCheckChange(checked: boolean | "indeterminate", now = new Date().toISOString()): [boolean, string | null] {
  return checked === true ? [true, now] : [false, null];
}