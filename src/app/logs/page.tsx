"use client";

import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ActiveTasksBanner } from "@/components/logs/active-tasks-banner";
import { ActivityLogTable } from "@/components/logs/activity-log-table";
import { Button } from "@/components/ui/button";
import { Terminal, RefreshCw, Sparkles } from "lucide-react";
import { useChatLogs } from "@/lib/hooks/use-family-data";
import { cn } from "@/lib/utils";

export default function LogsPage() {
  const { logs, isMockMode, isLoading, isValidating, mutate } = useChatLogs();

  const handleDeleteLog = async (id: string) => {
    await mutate(
      async (currentData) => {
        const res = await fetch(`/api/logs?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          throw new Error("Gagal menghapus log dari server");
        }
        return {
          logs: (currentData?.logs || []).filter((l) => l.id !== id),
          isMockMode: currentData?.isMockMode,
        };
      },
      {
        optimisticData: (currentData) => ({
          logs: (currentData?.logs || []).filter((l) => l.id !== id),
          isMockMode: currentData?.isMockMode,
        }),
        rollbackOnError: true,
        revalidate: true,
      }
    );
  };

  const handleClearAllLogs = async () => {
    await mutate(
      async (currentData) => {
        const res = await fetch("/api/logs?all=true", {
          method: "DELETE",
        });
        if (!res.ok) {
          throw new Error("Gagal mengosongkan log");
        }
        return {
          logs: [],
          isMockMode: currentData?.isMockMode,
        };
      },
      {
        optimisticData: (currentData) => ({
          logs: [],
          isMockMode: currentData?.isMockMode,
        }),
        rollbackOnError: true,
        revalidate: true,
      }
    );
  };

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Modular Page Header */}
        <PageHeader
          title="Log Chat & Pemantauan Proses"
          description="Monitor riwayat percakapan bot Telegram & WhatsApp, status latensi AI, serta kendali kill-switch proses aktif."
          icon={Terminal}
          isSyncing={isValidating && !isLoading}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isLoading || isValidating}
            title="Segarkan riwayat log"
          >
            <RefreshCw className={cn("size-3.5", isValidating && "animate-spin")} aria-hidden="true" />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>
        </PageHeader>

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
          onDeleteLog={handleDeleteLog}
          onClearAll={handleClearAllLogs}
        />
      </div>
    </AppShell>
  );
}
