"use client";

import React, { useState } from "react";
import { ChatActivityLog, LogChannel, LogStatus } from "@/lib/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import {
  Search,
  MessageSquare,
  Image,
  Mic,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Ban,
  Cpu,
  RefreshCw,
  Send,
} from "lucide-react";

interface ActivityLogTableProps {
  logs: ChatActivityLog[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function ActivityLogTable({ logs, isLoading, onRefresh }: ActivityLogTableProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<ChatActivityLog | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (selectedChannel !== "all" && log.channel !== selectedChannel) return false;
    if (selectedStatus !== "all" && log.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const sender = (log.sender_name || "").toLowerCase();
      const prompt = (log.raw_prompt || "").toLowerCase();
      const err = (log.error_message || "").toLowerCase();
      return sender.includes(q) || prompt.includes(q) || err.includes(q);
    }
    return true;
  });

  const getStatusBadge = (status: LogStatus) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] font-normal">
            <CheckCircle2 className="size-3" aria-hidden="true" />
            <span>Berhasil</span>
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="text-blue-500 border-blue-500 gap-1 text-[11px] font-normal animate-pulse">
            <Clock className="size-3 animate-spin" aria-hidden="true" />
            <span>Memproses</span>
          </Badge>
        );
      case "timeout":
        return (
          <Badge variant="destructive" className="gap-1 text-[11px] font-normal">
            <AlertTriangle className="size-3" aria-hidden="true" />
            <span>Timeout (15s)</span>
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary" className="gap-1 text-[11px] font-normal text-amber-600 dark:text-amber-400">
            <Ban className="size-3" aria-hidden="true" />
            <span>Dibatalkan</span>
          </Badge>
        );
      case "failed":
      default:
        return (
          <Badge variant="destructive" className="gap-1 text-[11px] font-normal">
            <XCircle className="size-3" aria-hidden="true" />
            <span>Gagal</span>
          </Badge>
        );
    }
  };

  const getChannelBadge = (channel: LogChannel) => {
    if (channel === "telegram") {
      return (
        <Badge variant="outline" className="text-blue-500 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-[11px] font-medium">
          Telegram
        </Badge>
      );
    }
    if (channel === "whatsapp") {
      return (
        <Badge variant="outline" className="text-emerald-500 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-[11px] font-medium">
          WhatsApp
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground text-[11px]">
        Web
      </Badge>
    );
  };

  const getInputTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="size-4 text-purple-500 shrink-0" aria-hidden="true" />;
      case "audio":
        return <Mic className="size-4 text-amber-500 shrink-0" aria-hidden="true" />;
      default:
        return <MessageSquare className="size-4 text-blue-500 shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>Riwayat Log Transaksi Chat</CardTitle>
              <Badge variant="outline" className="text-xs font-normal">
                {filteredLogs.length} Riwayat
              </Badge>
            </div>
            <CardDescription>
              Catatan interaksi masuk dari Telegram & WhatsApp beserta waktu eksekusi dan respon AI
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-8 text-xs gap-1.5"
              >
                <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
                <span>Segarkan</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Cari pengirim, pesan, atau error..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            {/* Channel and Status Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border p-0.5 bg-muted/40 text-xs">
                {["all", "telegram", "whatsapp"].map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannel(ch)}
                    className={`px-2.5 py-1 rounded-md transition-colors capitalize ${
                      selectedChannel === ch
                        ? "bg-background text-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ch === "all" ? "Semua Chat" : ch}
                  </button>
                ))}
              </div>

              <div className="flex items-center rounded-lg border p-0.5 bg-muted/40 text-xs">
                {[
                  { id: "all", label: "Semua Status" },
                  { id: "success", label: "Berhasil" },
                  { id: "failed", label: "Gagal" },
                  { id: "timeout", label: "Timeout" },
                  { id: "cancelled", label: "Batal" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStatus(st.id)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedStatus === st.id
                        ? "bg-background text-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Logs List Table */}
          <div className="rounded-lg border divide-y overflow-hidden">
            {filteredLogs.length === 0 ? (
              <div className="py-12 px-4 text-center text-muted-foreground">
                <MessageSquare className="size-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
                <p className="text-sm font-medium">Belum ada catatan aktivitas chat.</p>
                <p className="text-xs mt-1">
                  Log akan terisi otomatis setiap kali Anda atau anggota keluarga mengirim pesan atau foto nota ke bot.
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="p-3.5 hover:bg-muted/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
                      {getInputTypeIcon(log.input_type)}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">{log.sender_name}</span>
                        {getChannelBadge(log.channel)}
                        <span className="text-muted-foreground text-[11px] truncate">
                          {new Date(log.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-muted-foreground truncate mt-0.5">
                        {log.raw_prompt || `[Media ${log.input_type}]`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {log.latency_ms && (
                      <span className="text-[11px] tabular-nums text-muted-foreground font-mono">
                        {log.latency_ms}ms
                      </span>
                    )}
                    {getStatusBadge(log.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Detail Log */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <span>Detail Interaksi Chat</span>
              {selectedLog && getStatusBadge(selectedLog.status)}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rincian data log teknis dan hasil parsing AI
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="text-muted-foreground">Pengirim:</p>
                  <p className="font-semibold mt-0.5">{selectedLog.sender_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Channel & Tipe:</p>
                  <p className="font-semibold capitalize mt-0.5">{selectedLog.channel} • {selectedLog.input_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Model AI:</p>
                  <p className="font-semibold mt-0.5">{selectedLog.ai_model || "gemini-3.5-flash-lite"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Waktu & Latensi:</p>
                  <p className="font-semibold mt-0.5">
                    {new Date(selectedLog.created_at).toLocaleTimeString("id-ID")} ({selectedLog.latency_ms || 0}ms)
                  </p>
                </div>
              </div>

              <div>
                <p className="font-medium mb-1">Pesan / Input Pengguna:</p>
                <div className="p-2.5 rounded-md border bg-background font-mono text-[11px] break-words">
                  {selectedLog.raw_prompt || "[Media File]"}
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <p className="font-medium text-destructive mb-1">Pesan Kendala / Error:</p>
                  <div className="p-2.5 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-[11px]">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              {selectedLog.parsed_metadata && Object.keys(selectedLog.parsed_metadata).length > 0 && (
                <div>
                  <p className="font-medium mb-1">Hasil Ekstraksi Transaksi AI:</p>
                  <div className="p-2.5 rounded-md border bg-muted/20 font-mono text-[11px] max-h-48 overflow-y-auto">
                    <pre>{JSON.stringify(selectedLog.parsed_metadata, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
