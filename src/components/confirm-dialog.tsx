import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Pending = ConfirmOptions & { date?: string; resolve: (v: string | boolean | null) => void };
let show: ((p: Pending) => void) | null = null;

/** In-app replacement for window.confirm. Resolves true when the user confirms. */
export function confirmDialog(input: string | ConfirmOptions): Promise<boolean> {
  const opts: ConfirmOptions = typeof input === "string" ? { description: input } : input;
  if (!show) return Promise.resolve(false);
  return new Promise((resolve) => show!({ ...opts, resolve: (v) => resolve(v === true) }));
}

/** In-app date question. Resolves YYYY-MM-DD, or null when cancelled. */
export function promptDate(title: string, defaultDate = new Date().toISOString().slice(0, 10)): Promise<string | null> {
  if (!show) return Promise.resolve(null);
  return new Promise((resolve) =>
    show!({
      title,
      date: defaultDate,
      confirmLabel: "Save",
      destructive: false,
      resolve: (v) => resolve(typeof v === "string" ? v : null),
    }),
  );
}

function guessDestructive(o: ConfirmOptions) {
  if (o.destructive !== undefined) return o.destructive;
  const t = `${o.title ?? ""} ${o.description ?? ""} ${o.confirmLabel ?? ""}`.toLowerCase();
  return /delete|remove|clear|cancel follow|stop|permanent/.test(t);
}

export function ConfirmHost() {
  const [p, setP] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  useEffect(() => {
    show = (next) => {
      setP(next);
      setDate(next.date ?? "");
      setOpen(true);
    };
    return () => {
      show = null;
    };
  }, []);
  const close = (v: string | boolean | null) => {
    p?.resolve(v);
    setOpen(false);
  };
  const isDate = p?.date !== undefined;
  const destructive = p ? guessDestructive(p) : false;
  const title = p?.title ?? (destructive ? "Are you sure?" : "Please confirm");
  const ok = () => close(isDate ? (date || null) : true);
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && close(isDate ? null : false)}>
      <AlertDialogContent className="max-w-md rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">{title}</AlertDialogTitle>
          {p?.description && (
            <AlertDialogDescription className="text-[13px] leading-relaxed">{p.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {isDate && (
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && date && ok()}
            className="h-9"
          />
        )}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={() => close(isDate ? null : false)}>{p?.cancelLabel ?? "Cancel"}</AlertDialogCancel>
          <AlertDialogAction
            autoFocus={!isDate}
            disabled={isDate && !date}
            className={cn(destructive && buttonVariants({ variant: "destructive" }))}
            onClick={ok}
          >
            {p?.confirmLabel ?? (destructive ? "Delete" : "Confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
