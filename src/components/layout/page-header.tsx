"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ElementType;
  isSyncing?: boolean;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  isSyncing = false,
  children,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4",
        className
      )}
      {...props}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon
              className="size-5 sm:size-6 text-foreground shrink-0"
              aria-hidden="true"
            />
          )}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            {title}
          </h1>
          {isSyncing && (
            <span className="inline-flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground bg-muted px-2 py-0.5 rounded-full animate-pulse shrink-0">
              <RefreshCw className="size-2.5 animate-spin" aria-hidden="true" />
              <span>Sync</span>
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-start md:justify-end">
          {children}
        </div>
      )}
    </div>
  );
}
