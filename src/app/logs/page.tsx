"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/dashboard/navbar";
import { ActiveTasksBanner } from "@/components/logs/active-tasks-banner";
import { ActivityLogTable } from "@/components/logs/activity-log-table";
import { ChatActivityLog } from "@/lib/types/database";

export default function LogsPage() {
  const [logs, setLogs] = useState<ChatActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navbar */}
      <Navbar familyName="Keluarga F&R" />

      {/* Main Container */}
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Log Chat & Pemantauan Proses
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor riwayat percakapan bot Telegram & WhatsApp, status latensi AI, serta kendali kill-switch proses aktif.
            </p>
          </div>
        </div>

        {/* Live Active Tasks Banner & Kill Switch */}
        <ActiveTasksBanner onTaskCancelled={fetchLogs} />

        {/* Chat Activity Log Feed */}
        <ActivityLogTable
          logs={logs}
          isLoading={isLoading}
          onRefresh={fetchLogs}
        />
      </main>
    </div>
  );
}
