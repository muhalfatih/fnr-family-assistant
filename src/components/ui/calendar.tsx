"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-white rounded-2xl", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-between items-center px-1 pt-1 pb-2",
        caption_label: "text-xs font-bold text-slate-900",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 rounded-full text-slate-600 hover:text-slate-900 border-slate-200"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 rounded-full text-slate-600 hover:text-slate-900 border-slate-200"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex justify-between mb-1",
        weekday:
          "text-slate-400 size-8 font-semibold text-[11px] flex items-center justify-center text-center",
        weeks: "flex flex-col gap-1",
        week: "flex justify-between w-full",
        day: "size-8 p-0 text-center text-xs flex items-center justify-center",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-medium text-xs rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
        ),
        range_start: "rounded-l-full bg-slate-900 text-white",
        range_end: "rounded-r-full bg-slate-900 text-white",
        selected:
          "[&>.rdp-day_button]:bg-slate-900 [&>.rdp-day_button]:text-white [&>.rdp-day_button]:hover:bg-slate-800 [&>.rdp-day_button]:font-bold [&>.rdp-day_button]:rounded-full",
        today:
          "[&>.rdp-day_button]:bg-slate-100 [&>.rdp-day_button]:text-slate-900 [&>.rdp-day_button]:font-bold [&>.rdp-day_button]:rounded-full",
        outside: "text-slate-300 opacity-40",
        disabled: "text-slate-300 opacity-40 pointer-events-none",
        range_middle:
          "[&>.rdp-day_button]:bg-slate-100 [&>.rdp-day_button]:text-slate-900",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...props }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", className)} {...props} />
          ) : (
            <ChevronRight className={cn("size-4", className)} {...props} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
