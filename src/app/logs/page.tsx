"use client";

import React from "react";
import { Navbar } from "@/components/dashboard/navbar";
import { ActiveTasksBanner } from "@/components/logs/active-tasks-banner";
import { ActivityLogTable } from "@/components/logs/activity-log-table";
import { Button } from "@/components/ui/button";
import { Terminal, RefreshCw } from "lucide-react";
import { useChatLogs } from "@/lib/hooks/use-family-data";

export default function LogsPage() {
  const { logs, isLoading, isValidating, mutate } = useChatLogs();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navbar */}
      <Navbar familyName="Keluarga F&R" />

      {/* Main Container */}
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <Terminal className="size-7 text-primary shrink-0" aria-hidden="true" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                Log Chat & Pemantauan Proses
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Monitor riwayat percakapan bot Telegram & WhatsApp, status latensi AI, serta kendali kill-switch proses aktif.
              </p>
              {isValidating && !isLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-normal bg-muted px-2 py-0.5 rounded-full animate-pulse shrink-0">
                  <RefreshCw className="size-2.5 animate-spin" aria-hidden="true" />
                  <span>Sinkronisasi</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={isLoading}
              className="gap-1.5 h-9 text-xs px-3 rounded-md"
            >
              <RefreshCw className={`size-3.5 ${isValidating ? "animate-spin" : ""}`} aria-hidden="true" />
              <span>Segarkan</span>
            </Button>
          </div>
        </div>

        {/* Live Active Tasks Banner & Kill Switch */}
        <ActiveTasksBanner onTaskCancelled={() => mutate()} />

        {/* Chat Activity Log Feed */}
        <ActivityLogTable
          logs={logs}
          isLoading={isLoading && logs.length === 0}
          onRefresh={() => mutate()}
        />
      </main>
    </div>
  );
}
