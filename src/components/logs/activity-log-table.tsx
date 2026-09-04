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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { formatDateIndo, formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShoppingBag,
  Store,
  Tag,
  Wallet,
  Code,
  RefreshCw,
  Trash2,
  Loader2,
} from "lucide-react";

interface ActivityLogTableProps {
  logs: ChatActivityLog[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onDeleteLog?: (id: string) => Promise<void>;
  onClearAll?: () => Promise<void>;
}

export function ActivityLogTable({
  logs,
  isLoading,
  onRefresh,
  onDeleteLog,
  onClearAll,
}: ActivityLogTableProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<ChatActivityLog | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [logToDelete, setLogToDelete] = useState<ChatActivityLog | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState<boolean>(false);
  const [isClearAllOpen, setIsClearAllOpen] = useState<boolean>(false);
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);

  const handleDeleteSingleLog = async () => {
    if (!logToDelete) return;
    const targetId = logToDelete.id;
    setIsDeletingSingle(true);
    try {
      if (onDeleteLog) {
        await onDeleteLog(targetId);
      } else {
        const res = await fetch(`/api/logs?id=${encodeURIComponent(targetId)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          throw new Error("Gagal menghapus log");
        }
        onRefresh?.();
      }
      toast.success("Log aktivitas berhasil dihapus");
      setLogToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menghapus log");
    } finally {
      setIsDeletingSingle(false);
    }
  };

  const handleClearAllLogs = async () => {
    setIsClearingAll(true);
    try {
      if (onClearAll) {
        await onClearAll();
      } else {
        const res = await fetch("/api/logs?all=true", {
          method: "DELETE",
        });
        if (!res.ok) {
          throw new Error("Gagal mengosongkan log");
        }
        onRefresh?.();
      }
      toast.success("Seluruh riwayat log berhasil dibersihkan");
      setIsClearAllOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengosongkan log");
    } finally {
      setIsClearingAll(false);
    }
  };

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
          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] font-medium px-2 py-0.5 shrink-0">
            <CheckCircle2 className="size-3" aria-hidden="true" />
            <span>Berhasil</span>
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="text-blue-500 border-blue-500 gap-1 text-[11px] font-medium animate-pulse px-2 py-0.5 shrink-0">
            <Clock className="size-3 animate-spin" aria-hidden="true" />
            <span>Memproses</span>
          </Badge>
        );
      case "timeout":
        return (
          <Badge variant="destructive" className="gap-1 text-[11px] font-medium px-2 py-0.5 shrink-0">
            <AlertTriangle className="size-3" aria-hidden="true" />
            <span>Timeout</span>
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary" className="gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 px-2 py-0.5 shrink-0">
            <Ban className="size-3" aria-hidden="true" />
            <span>Dibatalkan</span>
          </Badge>
        );
      case "failed":
      default:
        return (
          <Badge variant="destructive" className="gap-1 text-[11px] font-medium px-2 py-0.5 shrink-0">
            <XCircle className="size-3" aria-hidden="true" />
            <span>Gagal</span>
          </Badge>
        );
    }
  };

  const getChannelBadge = (channel: LogChannel) => {
    if (channel === "telegram") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md shrink-0">
          <Send className="size-3" aria-hidden="true" />
          <span>Telegram</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md shrink-0">
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

  const copyRawJson = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog.parsed_metadata || selectedLog, null, 2));
    setCopiedJson(true);
    toast.success("JSON disalin ke papan klip");
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <>
      <Card className="rounded-xl border border-border/80 bg-card">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Riwayat Log Transaksi Chat</CardTitle>
              <Badge variant="outline" className="text-[11px] font-normal">
                {filteredLogs.length} Entri
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              {logs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClearAllOpen(true)}
                  disabled={isLoading || isClearingAll}
                  className="gap-1.5 h-7 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/60 cursor-pointer"
                  title="Hapus semua riwayat log"
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                  <span>Hapus Semua</span>
                </Button>
              )}
            </div>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Catatan interaksi masuk dari Telegram & WhatsApp beserta waktu eksekusi dan respon AI.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 min-w-0 max-w-full">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm min-w-0">
              <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Cari pengirim, pesan, atau error..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs sm:text-sm h-8 rounded-md"
              />
            </div>

            {/* Channel and Status Tabs with Mobile Horizontal Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full md:w-auto touch-pan-x min-w-0 max-w-full">
              <div className="flex items-center rounded-lg border border-border/70 p-1 bg-muted/40 text-xs shrink-0">
                {["all", "telegram", "whatsapp"].map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannel(ch)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize shrink-0 active:scale-95 ${
                      selectedChannel === ch
                        ? "bg-background text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ch === "all" ? "Semua Chat" : ch}
                  </button>
                ))}
              </div>

              <div className="flex items-center rounded-lg border border-border/70 p-1 bg-muted/40 text-xs shrink-0">
                {[
                  { id: "all", label: "Semua" },
                  { id: "success", label: "Berhasil" },
                  { id: "failed", label: "Gagal" },
                  { id: "timeout", label: "Timeout" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStatus(st.id)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all shrink-0 active:scale-95 ${
                      selectedStatus === st.id
                        ? "bg-background text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Logs List Feed */}
          <div className="space-y-2.5 pt-1">
            {filteredLogs.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-xl border border-dashed border-border text-muted-foreground bg-muted/10">
                <p className="text-sm font-semibold text-foreground">Tidak ada riwayat log chat yang sesuai.</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Kirim pesan teks transaksi, foto struk belanja, atau voice note ke bot WhatsApp atau Telegram untuk melihat rekaman aktivitas real-time di sini.
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const latencySec = log.latency_ms ? (log.latency_ms / 1000).toFixed(1) : "0.0";
                const meta = log.parsed_metadata;

                return (
                  <div
                    key={log.id}
                    onClick={() => {
                      setSelectedLog(log);
                      setShowRawJson(false);
                    }}
                    className="p-3.5 sm:p-4 rounded-xl border border-border/70 hover:border-primary/40 bg-card active:scale-[0.99] transition-all cursor-pointer shadow-xs space-y-2 group"
                  >
                    {/* Top Row: Channel, Input Icon, Sender & Status + Latency */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getChannelBadge(log.channel)}
                        {getInputTypeIcon(log.input_type)}
                        <span className="font-semibold text-foreground text-xs sm:text-sm truncate group-hover:text-primary transition-colors">
                          {log.sender_name || `Chat ID: ${log.chat_id || "-"}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                          <Cpu className="size-3" aria-hidden="true" />
                          <span>{latencySec}s</span>
                        </div>
                        {getStatusBadge(log.status)}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogToDelete(log);
                          }}
                          className="p-1 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Hapus log ini"
                          aria-label={`Hapus log ${log.id}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Prompt Preview */}
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {log.raw_prompt ? `"${log.raw_prompt}"` : "(Lampiran foto struk / pesan suara)"}
                    </p>

                    {/* Bottom Row: Timestamp + Quick Meta */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/50">
                      <span>
                        {formatDateIndo(log.created_at)} • {new Date(log.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {meta?.amount ? (
                        <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(meta.amount)}
                        </span>
                      ) : meta?.category ? (
                        <span className="font-medium text-foreground truncate max-w-[150px]">
                          {meta.category}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log Detail Bottom-Sheet / Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[560px] w-full max-w-[95vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-xl">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center justify-between gap-2 pr-6">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Log Detail Chat Bot
              </span>
              {selectedLog && getStatusBadge(selectedLog.status)}
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold">
              {selectedLog?.sender_name || "Pengguna Chat"}
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
            <div className="space-y-4 pt-1 text-xs">
              {/* Quick Specs Grid */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/80">
                <div>
                  <span className="text-[11px] text-muted-foreground">Saluran (Channel):</span>
                  <div className="mt-0.5">{getChannelBadge(selectedLog.channel)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Waktu Respon AI:</span>
                  <p className="tabular-nums font-semibold text-foreground mt-0.5">
                    {selectedLog.latency_ms || 0} ms ({((selectedLog.latency_ms || 0) / 1000).toFixed(2)}s)
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Jenis Input:</span>
                  <p className="capitalize font-medium text-foreground mt-0.5">
                    {selectedLog.input_type || "Teks"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Chat ID:</span>
                  <p className="tabular-nums text-muted-foreground truncate mt-0.5">
                    {selectedLog.chat_id || "-"}
                  </p>
                </div>
              </div>

              {/* User Input Prompt */}
              {selectedLog.raw_prompt && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-foreground text-xs">Pesan Masuk dari Pengguna:</span>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/70 text-xs leading-relaxed">
                    "{selectedLog.raw_prompt}"
                  </div>
                </div>
              )}

              {/* Structured AI Extraction Summary */}
              {selectedLog.parsed_metadata && (
                <div className="space-y-2 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <ShoppingBag className="size-4" aria-hidden="true" />
                    <span>Hasil Ekstraksi Finansial AI</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    {selectedLog.parsed_metadata.amount !== undefined && (
                      <div className="col-span-2 sm:col-span-1 p-2 rounded-lg bg-background border border-border/60">
                        <span className="text-[11px] text-muted-foreground">Total Transaksi:</span>
                        <p className="tabular-nums font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {formatRupiah(selectedLog.parsed_metadata.amount)}
                        </p>
                      </div>
                    )}

                    {selectedLog.parsed_metadata.category && (
                      <div className="col-span-2 sm:col-span-1 p-2 rounded-lg bg-background border border-border/60">
                        <span className="text-[11px] text-muted-foreground">Kategori:</span>
                        <p className="font-medium text-foreground truncate mt-0.5">
                          {selectedLog.parsed_metadata.category}
                        </p>
                      </div>
                    )}

                    {selectedLog.parsed_metadata.merchant && (
                      <div className="col-span-2 sm:col-span-1 p-2 rounded-lg bg-background border border-border/60">
                        <span className="text-[11px] text-muted-foreground">Toko / Merchant:</span>
                        <p className="font-medium text-foreground truncate mt-0.5">
                          {selectedLog.parsed_metadata.merchant}
                        </p>
                      </div>
                    )}

                    {selectedLog.parsed_metadata.wallet_hint && (
                      <div className="col-span-2 sm:col-span-1 p-2 rounded-lg bg-background border border-border/60">
                        <span className="text-[11px] text-muted-foreground">Petunjuk Dompet:</span>
                        <p className="font-medium text-foreground truncate mt-0.5">
                          {selectedLog.parsed_metadata.wallet_hint}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Itemized List if available */}
                  {Array.isArray(selectedLog.parsed_metadata.items) && selectedLog.parsed_metadata.items.length > 0 && (
                    <div className="pt-2 border-t border-primary/15 space-y-1.5">
                      <span className="text-[11px] font-semibold text-foreground">
                        Daftar Item Struk Belanja ({selectedLog.parsed_metadata.items.length}):
                      </span>
                      <div className="max-h-36 overflow-y-auto divide-y rounded-lg border border-border/60 bg-background">
                        {selectedLog.parsed_metadata.items.map((it: any, idx: number) => (
                          <div key={idx} className="p-2 flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground truncate">{it.name}</p>
                              {it.raw_name && it.raw_name !== it.name && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  Asli: {it.raw_name}
                                </p>
                              )}
                            </div>
                            <span className="tabular-nums text-muted-foreground shrink-0">
                              {it.qty || 1}x {it.price ? formatRupiah(it.price) : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Natural Language Answer if Q&A */}
                  {selectedLog.parsed_metadata.answer && (
                    <div className="pt-2 border-t border-primary/15 space-y-1">
                      <span className="text-[11px] font-semibold text-foreground">Jawaban Asisten AI:</span>
                      <div className="p-2.5 rounded-lg bg-background border border-border/60 text-xs leading-relaxed whitespace-pre-line">
                        {selectedLog.parsed_metadata.answer}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message Box */}
              {selectedLog.error_message && (
                <div className="space-y-1.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                    <span>Laporan Kesalahan / Error:</span>
                  </div>
                  <div className="font-mono text-xs break-all bg-background/50 p-2.5 rounded-lg border border-destructive/15">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              {/* Collapsible Raw JSON Inspector */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-xs font-medium text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Code className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    <span>Lihat Metadata Raw JSON</span>
                  </div>
                  {showRawJson ? (
                    <ChevronUp className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  )}
                </button>

                {showRawJson && (
                  <div className="mt-2 relative">
                    <button
                      type="button"
                      onClick={copyRawJson}
                      className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 px-2 py-1 rounded bg-background border border-border text-[11px] text-muted-foreground hover:text-foreground font-medium shadow-xs"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="size-3 text-emerald-500" aria-hidden="true" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" aria-hidden="true" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                    <pre className="p-3 rounded-xl bg-muted/60 border border-border font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.parsed_metadata || selectedLog, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Close & Delete Actions */}
              <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const log = selectedLog;
                    setSelectedLog(null);
                    setLogToDelete(log);
                  }}
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/60 gap-1.5 cursor-pointer"
                >
                  <Trash2 className="size-3" />
                  <span>Hapus Log Ini</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="h-8 text-xs px-4 rounded-md active:scale-98 cursor-pointer"
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Single Log Alert Dialog */}
      <AlertDialog open={!!logToDelete} onOpenChange={(open) => !open && !isDeletingSingle && setLogToDelete(null)}>
        <AlertDialogContent className="sm:max-w-[420px] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Hapus Log Aktivitas Ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Entri log dari <strong className="text-foreground font-semibold">{logToDelete?.sender_name || "pengguna"}</strong> pada {logToDelete && formatDateIndo(logToDelete.created_at)} akan dihapus permanen dari riwayat pemantauan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
            <AlertDialogCancel disabled={isDeletingSingle} className="h-8 text-xs cursor-pointer">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteSingleLog();
              }}
              disabled={isDeletingSingle}
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5 cursor-pointer"
            >
              {isDeletingSingle ? (
                <>
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-3" aria-hidden="true" />
                  <span>Hapus Log</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Logs Alert Dialog */}
      <AlertDialog open={isClearAllOpen} onOpenChange={(open) => !open && !isClearingAll && setIsClearAllOpen(false)}>
        <AlertDialogContent className="sm:max-w-[420px] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Hapus Seluruh Riwayat Log?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Seluruh {logs.length} entri riwayat chat bot (Telegram & WhatsApp) akan dibersihkan secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
            <AlertDialogCancel disabled={isClearingAll} className="h-8 text-xs cursor-pointer">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleClearAllLogs();
              }}
              disabled={isClearingAll}
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5 cursor-pointer"
            >
              {isClearingAll ? (
                <>
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  <span>Membersihkan...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-3" aria-hidden="true" />
                  <span>Hapus Semua Log</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
