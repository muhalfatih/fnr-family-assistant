"use client";

import React, { useState } from "react";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { Transaction } from "@/lib/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ExternalLink,
  Trash2,
  Calendar,
  Wallet,
  Tag,
  User,
  ShoppingBag,
  MessageSquare,
  Mic,
  Image as ImageIcon,
  CheckCircle2,
  HelpCircle,
  Maximize2,
} from "lucide-react";

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export function TransactionDetailModal({
  transaction,
  isOpen,
  onClose,
  onDelete,
}: TransactionDetailModalProps) {
  const [imageError, setImageError] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);

  if (!transaction) return null;

  const isExpense = transaction.type === "expense";
  const isIncome = transaction.type === "income";

  // Resolve media pointers
  const mediaUrl =
    transaction.drive_view_url ||
    transaction.parsed_metadata?.drive_view_url ||
    transaction.media_url ||
    null;

  const isImage =
    transaction.media_type === "image" ||
    (mediaUrl && (mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) || mediaUrl.includes("/receipts/")));

  const isAudio =
    transaction.media_type === "audio" ||
    (mediaUrl && mediaUrl.match(/\.(ogg|oga|opus|mp3|wav|m4a)/i));

  const items = transaction.parsed_metadata?.items || [];
  const rawPrompt = transaction.raw_prompt || transaction.parsed_metadata?.original_transcription;
  const merchant = transaction.parsed_metadata?.merchant;

  // Determine source channel
  const sourceChannel =
    transaction.parsed_metadata?.source ||
    (transaction.raw_prompt?.toLowerCase().includes("whatsapp") ? "whatsapp" : "telegram");

  const channelBadge = () => {
    if (sourceChannel === "whatsapp") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-medium">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          WhatsApp Bot
        </Badge>
      );
    }
    if (sourceChannel === "telegram") {
      return (
        <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 gap-1 text-[11px] font-medium">
          <span className="size-1.5 rounded-full bg-sky-500" />
          Telegram Bot
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 text-[11px] font-medium">
        <span className="size-1.5 rounded-full bg-muted-foreground" />
        Web Dashboard
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl gap-5">
        <DialogHeader className="space-y-3 pb-3 border-b border-border/70">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={isExpense ? "destructive" : "default"}
                className={`text-xs px-2.5 py-0.5 font-medium ${
                  isIncome ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""
                }`}
              >
                {isIncome ? "Pemasukan" : isExpense ? "Pengeluaran" : "Transfer"}
              </Badge>
              {channelBadge()}
            </div>

            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formatDateIndo(transaction.transaction_date)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {transaction.description || (merchant ? `Belanja ${merchant}` : "Detail Transaksi")}
            </DialogTitle>
            <span
              className={`text-2xl sm:text-3xl font-bold tabular-nums ${
                isIncome
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-foreground"
              }`}
            >
              {isIncome ? "+" : "-"}
              {formatRupiah(transaction.amount)}
            </span>
          </div>
          <DialogDescription className="sr-only">
            Rincian informasi lengkap transaksi dan preview bukti media terkait.
          </DialogDescription>
        </DialogHeader>

        {/* 2-Column Responsive Layout: Left = Metadata & Items, Right = Media Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left Column: Transaction Metadata & Itemized Receipt */}
          <div className="space-y-4">
            {/* Metadata Badges & Cards */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Tag className="size-3 text-primary" /> Kategori
                </span>
                <p className="font-semibold text-foreground truncate">
                  {transaction.category?.name || "Umum"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="size-3 text-primary" /> Dompet / Akun
                </span>
                <p className="font-semibold text-foreground truncate">
                  {transaction.wallet?.name || "Dompet Utama"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <User className="size-3 text-primary" /> Dicatat Oleh
                </span>
                <p className="font-semibold text-foreground truncate">
                  {transaction.member?.full_name || "Anggota Keluarga"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <ShoppingBag className="size-3 text-primary" /> Toko / Merchant
                </span>
                <p className="font-semibold text-foreground truncate">
                  {merchant || "-"}
                </p>
              </div>
            </div>

            {/* Raw Prompt / Input Note */}
            {rawPrompt && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-xs space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                  <MessageSquare className="size-3 text-muted-foreground" />
                  Pesan / Input Asli:
                </span>
                <p className="italic text-foreground/90 font-mono text-[11px] leading-relaxed bg-background/50 p-2 rounded-lg border border-border/40">
                  "{rawPrompt}"
                </p>
              </div>
            )}

            {/* Itemized Receipt Table (if present) */}
            {items && items.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <ShoppingBag className="size-3.5 text-primary" />
                    Rincian Item Belanja ({items.length})
                  </span>
                </div>

                <div className="rounded-xl border border-border/70 overflow-hidden divide-y divide-border/60 text-xs bg-muted/20">
                  {items.map((item: any, idx: number) => {
                    const qty = item.qty && Number(item.qty) > 0 ? Number(item.qty) : 1;
                    const price = Number(item.price) || 0;
                    const subtotal = qty * price;
                    return (
                      <div key={idx} className="p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {qty}x @ {formatRupiah(price)}
                          </p>
                        </div>
                        <span className="font-semibold text-foreground tabular-nums shrink-0">
                          {formatRupiah(subtotal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Media Preview (Receipt Photo or Voice Note) */}
          <div className="flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground mb-2">
                {isImage ? (
                  <>
                    <ImageIcon className="size-3.5 text-primary" /> Bukti Struk Transaksi
                  </>
                ) : isAudio ? (
                  <>
                    <Mic className="size-3.5 text-primary" /> Rekaman Suara
                  </>
                ) : (
                  <>
                    <FileText className="size-3.5 text-muted-foreground" /> Media Transaksi
                  </>
                )}
              </span>

              {/* Image Preview Box */}
              {isImage && mediaUrl && !imageError ? (
                <div className="relative group rounded-xl overflow-hidden border border-border/80 bg-muted/40 aspect-[3/4] flex items-center justify-center">
                  <img
                    src={mediaUrl}
                    alt={transaction.description || "Struk Belanja"}
                    className={`w-full h-full object-contain transition-transform duration-300 ${
                      imageZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
                    }`}
                    onClick={() => setImageZoomed(!imageZoomed)}
                    onError={() => setImageError(true)}
                  />

                  {/* Overlay Action Bar */}
                  <div className="absolute bottom-2 inset-x-2 flex items-center justify-between p-2 rounded-lg bg-black/60 backdrop-blur-md text-white opacity-90 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-medium flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-emerald-400" />
                      Tersimpan Aman
                    </span>
                    <a
                      href={mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold hover:underline bg-white/20 px-2 py-0.5 rounded-md"
                    >
                      <span>Buka Tab Baru</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              ) : isAudio && mediaUrl ? (
                /* Audio Player Preview */
                <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Pesan suara yang diproses otomatis oleh kecerdasan buatan Gemini AI:
                  </p>
                  <audio controls className="w-full">
                    <source src={mediaUrl} />
                    Browser Anda tidak mendukung pemutar audio.
                  </audio>
                </div>
              ) : (
                /* No Media Placeholder */
                <div className="rounded-xl border border-dashed border-border/80 p-6 flex flex-col items-center justify-center text-center text-muted-foreground aspect-[3/2] bg-muted/20 space-y-2">
                  <FileText className="size-8 stroke-1 text-muted-foreground/60" />
                  <p className="text-xs font-medium">Transaksi Manual / Teks</p>
                  <p className="text-[11px] text-muted-foreground/80 max-w-[220px]">
                    Transaksi ini dicatat langsung tanpa lampiran foto struk atau pesan suara.
                  </p>
                </div>
              )}
            </div>

            {/* Storage Indicator */}
            {mediaUrl && (
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Penyimpanan:</span>
                <span className="font-medium text-foreground">
                  {mediaUrl.includes("r2.")
                    ? "Cloudflare R2"
                    : "Penyimpanan Lokal"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-border/70 mt-2">
          {onDelete ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onDelete(transaction.id);
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 text-xs gap-1.5"
            >
              <Trash2 className="size-3.5" />
              Hapus Transaksi Ini
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 justify-end">
            {mediaUrl && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs gap-1.5"
              >
                <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  Lihat Media Asli
                </a>
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={onClose}
              className="text-xs px-4"
            >
              Tutup
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
