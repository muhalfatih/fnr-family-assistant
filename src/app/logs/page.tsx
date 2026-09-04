"use client";

import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ActiveTasksBanner } from "@/components/logs/active-tasks-banner";
import { ActivityLogTable } from "@/components/logs/activity-log-table";
import { Button } from "@/components/ui/button";
import { Terminal, RefreshCw, Sparkles } from "lucide-react";
import { useChatLogs } from "@/lib/hooks/use-family-data";

export default function LogsPage() {
  const { logs, isMockMode, isLoading, isValidating, mutate } = useChatLogs();

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <Terminal className="size-5 sm:size-6 text-foreground shrink-0" aria-hidden="true" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                Log Chat & Pemantauan Proses
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Monitor riwayat percakapan bot Telegram & WhatsApp, status latensi AI, serta kendali kill-switch proses aktif.
              </p>
              {isValidating && !isLoading && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full animate-pulse shrink-0">
                  <RefreshCw className="size-2.5 animate-spin" aria-hidden="true" />
                  <span>Sync</span>
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
              className="gap-1.5 h-8 text-xs px-2.5 rounded-md"
            >
              <RefreshCw className={`size-3.5 ${isValidating ? "animate-spin" : ""}`} aria-hidden="true" />
              <span>Segarkan</span>
            </Button>
          </div>
        </div>

        {/* Live Active Tasks Banner & Kill Switch */}
        <ActiveTasksBanner onTaskCancelled={() => mutate()} />

        {/* Mock Mode Indicator Banner */}
        {isMockMode && (
          <div className="flex items-start sm:items-center gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200">
            <Sparkles className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold">Mode Simulasi (Mock Data): </span>
              Kredensial WhatsApp, Telegram, atau Supabase belum disetup pada environment ini. Menampilkan data aktivitas simulasi untuk keperluan preview antarmuka dan alur kerja.
            </div>
          </div>
        )}

        {/* Chat Activity Log Feed */}
        <ActivityLogTable
          logs={logs}
          isLoading={isLoading && logs.length === 0}
          onRefresh={() => mutate()}
        />
      </div>
    </AppShell>
  );
}
