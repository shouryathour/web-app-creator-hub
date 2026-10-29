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

/** What one plain click on a lead or deal does, chosen in Settings → Account. */
export type LeadClickMode = "panel" | "tab";
export const LEAD_CLICK_KEY = "buzzspear.leadClick";
export function getLeadClickMode(): LeadClickMode {
  if (typeof window === "undefined") return "panel";
  return window.localStorage.getItem(LEAD_CLICK_KEY) === "tab" ? "tab" : "panel";
}
export function setLeadClickMode(m: LeadClickMode) {
  window.localStorage.setItem(LEAD_CLICK_KEY, m);
}

/** Plain left click follows the user's setting; Ctrl/Cmd/Shift/middle click keep normal link behaviour. */
export function peekClick(e: React.MouseEvent, open: () => void) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  e.stopPropagation();
  if (getLeadClickMode() === "tab") {
    const href = (e.currentTarget as HTMLElement).closest("a")?.getAttribute("href");
    if (href) {
      window.open(href, "_blank", "noopener");
      return;
    }
  }
  open();
}
