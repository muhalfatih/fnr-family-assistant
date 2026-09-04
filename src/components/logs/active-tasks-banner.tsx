"use client";

import React, { useState, useEffect } from "react";
import { ActiveProcessInfo } from "@/lib/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, StopCircle, Radio, Image, Mic, MessageSquare } from "lucide-react";

interface ActiveTasksBannerProps {
  onTaskCancelled?: () => void;
}

export function ActiveTasksBanner({ onTaskCancelled }: ActiveTasksBannerProps) {
  const [tasks, setTasks] = useState<ActiveProcessInfo[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/bot/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error("Failed to fetch active tasks:", e);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(() => {
      fetchTasks();
      setNow(Date.now());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelTask = async (taskId: string) => {
    setCancellingId(taskId);
    try {
      const res = await fetch("/api/bot/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          reason: "Dibatalkan melalui Web Dashboard",
        }),
      });
      if (res.ok) {
        await fetchTasks();
        if (onTaskCancelled) onTaskCancelled();
      }
    } catch (err) {
      console.error("Failed to cancel task:", err);
    } finally {
      setCancellingId(null);
    }
  };

  const getInputIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="size-3.5" aria-hidden="true" />;
      case "audio":
        return <Mic className="size-3.5" aria-hidden="true" />;
      default:
        return <MessageSquare className="size-3.5" aria-hidden="true" />;
    }
  };

  if (tasks.length === 0) {
    return (
      <Card className="rounded-xl border border-border/80 bg-muted/20">
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-foreground">Sistem AI Siaga</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline text-muted-foreground">Tidak ada proses chat yang sedang berjalan</span>
          </div>
          <Badge variant="outline" className="text-[10px] sm:text-[11px] font-normal text-muted-foreground self-start sm:self-auto shrink-0">
            Batas Timeout: 15s
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-destructive/40 bg-destructive/5">
      <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-destructive animate-pulse shrink-0" aria-hidden="true" />
            <CardTitle className="text-sm sm:text-base text-destructive font-semibold">
              Proses Chat AI Sedang Berjalan ({tasks.length})
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-destructive/80">
            Monitor dan hentikan paksa proses jika respon memakan waktu terlalu lama.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0 grid gap-2.5">
        {tasks.map((task) => {
          const elapsedSec = Math.round((now - task.startTime) / 1000);
          const isCancelling = cancellingId === task.taskId || task.status === "cancelling";

          return (
            <div
              key={task.taskId}
              className="p-3 sm:p-3.5 rounded-xl border border-destructive/20 bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-xs"
            >
              <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                <Loader2 className="size-4 text-destructive animate-spin shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="font-semibold text-foreground text-xs sm:text-sm truncate">{task.senderName}</span>
                    <Badge variant="outline" className="capitalize text-[10px] gap-1 px-1.5 py-0 shrink-0">
                      {getInputIcon(task.inputType)}
                      <span>{task.channel}</span>
                    </Badge>
                    <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
                      ({elapsedSec}s / 15s)
                    </span>
                  </div>
                  {task.rawPrompt && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      "{task.rawPrompt}"
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleCancelTask(task.taskId)}
                disabled={isCancelling}
                className="w-full sm:w-auto h-8 gap-1.5 text-xs font-semibold shrink-0 rounded-md active:scale-98"
              >
                {isCancelling ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <StopCircle className="size-3.5" aria-hidden="true" />
                )}
                <span>{isCancelling ? "Menghentikan..." : "Hentikan Proses"}</span>
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
