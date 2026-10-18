export function taskAssignee(value: string | null | undefined) {
  return value && value !== "unassigned" ? value : null;
}