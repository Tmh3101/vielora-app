"use client";

import { useMemo, useState } from "react";
import { endOfDay, format, startOfDay, subDays, subMonths } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateRangePickerProps {
  from: Date;
  to: Date;
  onChange: (range: { from: Date; to: Date }) => void;
}

const PRESET_RANGES = [
  {
    key: "today",
    label: "Hôm nay",
    getRange: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    key: "week",
    label: "Tuần",
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    key: "month",
    label: "Tháng",
    getRange: () => ({
      from: startOfDay(subMonths(new Date(), 1)),
      to: endOfDay(new Date()),
    }),
  },
];

/**
 * Renders a date range picker button that opens a popover containing a range calendar and preset range buttons.
 *
 * @param from - The externally controlled start date of the selected range.
 * @param to - The externally controlled end date of the selected range.
 * @param onChange - Callback invoked with `{ from, to }` when the user finalizes a new range (via a preset or selecting both start and end in the calendar).
 * @returns A React element containing the trigger button and popover calendar for selecting a date range.
 */
export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>({ from, to });

  const label = useMemo(
    () => `${format(from, "dd/MM/yyyy")} - ${format(to, "dd/MM/yyyy")}`,
    [from, to]
  );
  const selectedPreset = useMemo(() => {
    return PRESET_RANGES.find((preset) => {
      const range = preset.getRange();
      return (
        range.from.toISOString() === from.toISOString() &&
        range.to.toISOString() === to.toISOString()
      );
    })?.key;
  }, [from, to]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 w-full justify-start border-border/60 bg-background px-3 text-left text-xs font-medium hover:border-primary/40 hover:bg-white hover:text-primary sm:w-auto",
            !from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] rounded-xl border-border/60 p-2 shadow-lg" align="end">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            {PRESET_RANGES.map((preset) => (
              <Button
                key={preset.key}
                type="button"
                size="sm"
                variant={selectedPreset === preset.key ? "default" : "outline"}
                className={cn(
                  "h-8 rounded-md px-2 text-xs",
                  selectedPreset !== preset.key &&
                    "border-border/60 hover:border-primary/40 hover:bg-white hover:text-primary"
                )}
                onClick={() => {
                  const nextRange = preset.getRange();
                  setDraftRange(nextRange);
                  onChange(nextRange);
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            numberOfMonths={1}
            selected={draftRange}
            defaultMonth={to}
            className="rounded-lg bg-card p-3"
            classNames={{
              months: "flex flex-col",
              month: "space-y-2",
              caption: "relative flex items-center justify-center",
              caption_label: "text-sm font-semibold text-foreground",
              nav_button:
                "h-7 w-7 rounded-md border border-transparent bg-transparent p-0 opacity-60 hover:border-border hover:bg-muted hover:text-foreground hover:opacity-100",
              table: "mx-auto w-[252px] border-collapse space-y-1",
              head_row: "flex",
              head_cell:
                "h-8 w-9 rounded-md text-center text-[11px] font-medium text-muted-foreground",
              row: "mt-1 flex w-full",
              cell: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected].day-range-middle)]:border-y [&:has([aria-selected].day-range-middle)]:border-primary/25 [&:has([aria-selected].day-range-middle)]:bg-primary/15 [&:has([aria-selected].day-range-start)]:rounded-l-md [&:has([aria-selected].day-range-end)]:rounded-r-md",
              day: "h-9 w-9 rounded-md border border-transparent bg-transparent p-0 text-sm font-medium text-foreground hover:border-primary/20 hover:bg-primary/10 hover:text-primary",
              day_today: "border border-border bg-muted text-foreground",
              day_selected:
                "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_range_start:
                "day-range-start aria-selected:rounded-md aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:font-bold aria-selected:shadow-md",
              day_range_end:
                "day-range-end aria-selected:rounded-md aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:font-bold aria-selected:shadow-md",
              day_range_middle:
                "day-range-middle aria-selected:rounded-none aria-selected:bg-primary/15 aria-selected:text-primary aria-selected:font-semibold",
              day_outside: "text-muted-foreground opacity-40",
            }}
            onSelect={(range) => {
              setDraftRange(range);

              if (range?.from && range.to) {
                onChange({ from: range.from, to: range.to });
                setOpen(false);
              }
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
