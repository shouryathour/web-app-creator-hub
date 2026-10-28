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
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
let show: ((p: Pending) => void) | null = null;

/** In-app replacement for window.confirm. Resolves true when the user confirms. */
export function confirmDialog(input: string | ConfirmOptions): Promise<boolean> {
  const opts: ConfirmOptions = typeof input === "string" ? { description: input } : input;
  if (!show) return Promise.resolve(false);
  return new Promise((resolve) => show!({ ...opts, resolve }));
}

function guessDestructive(o: ConfirmOptions) {
  if (o.destructive !== undefined) return o.destructive;
  const t = `${o.title ?? ""} ${o.description ?? ""} ${o.confirmLabel ?? ""}`.toLowerCase();
  return /delete|remove|clear|cancel follow|stop|permanent/.test(t);
}

export function ConfirmHost() {
  const [p, setP] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    show = (next) => {
      setP(next);
      setOpen(true);
    };
    return () => {
      show = null;
    };
  }, []);
  const close = (ok: boolean) => {
    p?.resolve(ok);
    setOpen(false);
  };
  const destructive = p ? guessDestructive(p) : false;
  const title = p?.title ?? (destructive ? "Are you sure?" : "Please confirm");
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && close(false)}>
      <AlertDialogContent className="max-w-md rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">{title}</AlertDialogTitle>
          {p?.description && (
            <AlertDialogDescription className="text-[13px] leading-relaxed">{p.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={() => close(false)}>{p?.cancelLabel ?? "Cancel"}</AlertDialogCancel>
          <AlertDialogAction
            autoFocus
            className={cn(destructive && buttonVariants({ variant: "destructive" }))}
            onClick={() => close(true)}
          >
            {p?.confirmLabel ?? (destructive ? "Delete" : "Confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
