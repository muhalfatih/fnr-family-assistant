"use client";

import React, { useState } from "react";
import { ChatActivityLog, LogChannel, LogStatus } from "@/lib/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDateIndo } from "@/lib/utils";
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
          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] font-medium">
            <CheckCircle2 className="size-3" aria-hidden="true" />
            <span>Berhasil</span>
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="text-blue-500 border-blue-500 gap-1 text-[11px] font-medium animate-pulse">
            <Clock className="size-3 animate-spin" aria-hidden="true" />
            <span>Memproses</span>
          </Badge>
        );
      case "timeout":
        return (
          <Badge variant="destructive" className="gap-1 text-[11px] font-medium">
            <AlertTriangle className="size-3" aria-hidden="true" />
            <span>Timeout</span>
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary" className="gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <Ban className="size-3" aria-hidden="true" />
            <span>Dibatalkan</span>
          </Badge>
        );
      case "failed":
      default:
        return (
          <Badge variant="destructive" className="gap-1 text-[11px] font-medium">
            <XCircle className="size-3" aria-hidden="true" />
            <span>Gagal</span>
          </Badge>
        );
    }
  };

  const getChannelBadge = (channel: LogChannel) => {
    if (channel === "telegram") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">
          <Send className="size-3" aria-hidden="true" />
          <span>Telegram</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
        <span>WhatsApp</span>
      </span>
    );
  };

  const getInputTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />;
      case "audio":
        return <Mic className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />;
      default:
        return <MessageSquare className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <>
      <Card className="rounded-xl border border-border/80 bg-card">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Riwayat Log Transaksi Chat</CardTitle>
            <Badge variant="outline" className="text-[11px] font-normal">
              {filteredLogs.length} Entri
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Catatan interaksi masuk dari Telegram & WhatsApp beserta waktu eksekusi dan respon AI.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 pt-0 space-y-3">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Cari pengirim, pesan, atau error..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 rounded-md"
              />
            </div>

            {/* Channel and Status Tabs with Mobile Horizontal Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full md:w-auto touch-pan-x">
              <div className="flex items-center rounded-md border p-0.5 bg-muted/40 text-xs shrink-0">
                {["all", "telegram", "whatsapp"].map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannel(ch)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize shrink-0 ${
                      selectedChannel === ch
                        ? "bg-background text-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ch === "all" ? "Semua Chat" : ch}
                  </button>
                ))}
              </div>

              <div className="flex items-center rounded-md border p-0.5 bg-muted/40 text-xs shrink-0">
                {[
                  { id: "all", label: "Semua" },
                  { id: "success", label: "Berhasil" },
                  { id: "failed", label: "Gagal" },
                  { id: "timeout", label: "Timeout" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStatus(st.id)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
                      selectedStatus === st.id
                        ? "bg-background text-foreground font-semibold shadow-sm"
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
              <div className="py-12 px-4 text-center">
                <p className="text-sm font-medium text-foreground">Tidak ada riwayat log chat yang sesuai.</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Kirim pesan teks transaksi, foto struk belanja, atau voice note ke bot WhatsApp (+62 851-1131-4440) atau Telegram untuk melihat rekaman aktivitas real-time di sini.
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const latencySec = log.latency_ms ? (log.latency_ms / 1000).toFixed(1) : "0.0";

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="p-3.5 sm:px-4 transition-colors hover:bg-muted/40 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    {/* Left: Channel, Sender & Preview */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5 sm:mt-0">
                        {getChannelBadge(log.channel)}
                        {getInputTypeIcon(log.input_type)}
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">
                            {log.sender_name || `Chat ID: ${log.chat_id || "-"}`}
                          </span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {new Date(log.created_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <p className="text-muted-foreground truncate mt-0.5 text-xs">
                          {log.raw_prompt ? `"${log.raw_prompt}"` : "(Lampiran foto/audio)"}
                        </p>
                      </div>
                    </div>

                    {/* Right: Latency & Status Badge */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-7 sm:pl-0">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono tabular-nums">
                        <Cpu className="size-3" aria-hidden="true" />
                        <span>{latencySec}s</span>
                      </div>
                      <div>{getStatusBadge(log.status)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[540px] w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span>Detail Eksekusi Chat AI</span>
              {selectedLog && getStatusBadge(selectedLog.status)}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedLog && formatDateIndo(selectedLog.created_at)} pukul{" "}
              {selectedLog &&
                new Date(selectedLog.created_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3.5 text-xs pt-1">
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40 border">
                <div>
                  <span className="text-muted-foreground">Pengirim:</span>
                  <p className="font-semibold text-foreground">{selectedLog.sender_name || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Waktu Proses:</span>
                  <p className="font-mono font-semibold text-foreground">
                    {selectedLog.latency_ms || 0} ms ({((selectedLog.latency_ms || 0) / 1000).toFixed(2)} detik)
                  </p>
                </div>
              </div>

              {selectedLog.raw_prompt && (
                <div className="space-y-1">
                  <span className="font-medium text-foreground">Input Pengguna:</span>
                  <div className="p-2.5 rounded-lg bg-muted/40 border font-mono text-xs max-h-28 overflow-y-auto">
                    {selectedLog.raw_prompt}
                  </div>
                </div>
              )}

              {selectedLog.parsed_metadata && (
                <div className="space-y-1">
                  <span className="font-medium text-foreground">Metadata / Hasil Ekstraksi:</span>
                  <div className="p-2.5 rounded-lg bg-muted/40 border font-mono text-xs max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.parsed_metadata, null, 2)}
                  </div>
                </div>
              )}

              {selectedLog.error_message && (
                <div className="space-y-1">
                  <span className="font-medium text-destructive">Detail Error:</span>
                  <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono">
                    {selectedLog.error_message}
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
