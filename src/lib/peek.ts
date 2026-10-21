import { useSyncExternalStore } from "react";

export type PeekTarget = { kind: "lead" | "record"; id: string } | null;

let current: PeekTarget = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const openLeadPeek = (id: string) => { current = { kind: "lead", id }; emit(); };
export const openRecordPeek = (id: string) => { current = { kind: "record", id }; emit(); };
export const closePeek = () => { current = null; emit(); };

export function usePeek() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => current,
    () => null,
  );
}

/** Plain left click opens the side panel; Ctrl/Cmd/Shift/middle click keep normal link behaviour. */
export function peekClick(e: React.MouseEvent, open: () => void) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  e.stopPropagation();
  open();
}
