import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** The app's single date picker. Value is "yyyy-MM-dd" or "". */
export function DateField({
  value,
  onChange,
  className,
  disabled,
  placeholder = "Pick date",
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const v = value ? String(value).slice(0, 10) : "";
  const dt = v ? new Date(`${v}T12:00:00`) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("h-8 justify-start gap-1.5 px-2 text-[13px] font-normal", !v && "text-muted-foreground", className)}
        >
          <CalendarIcon className="size-3.5 shrink-0" />
          <span className="truncate">{dt ? format(dt, "d MMM yyyy") : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="pointer-events-auto z-[100] w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={dt}
          defaultMonth={dt}
          onSelect={(d) => {
            onChange(d ? format(d, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          initialFocus
          className="pointer-events-auto p-3"
        />
        {v && (
          <div className="border-t border-border p-2">
            <Button type="button" variant="ghost" size="sm" className="h-7 w-full text-[12px]" onClick={() => { onChange(""); setOpen(false); }}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
