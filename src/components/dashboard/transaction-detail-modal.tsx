"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  Loader2,
  AlertCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  X,
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
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    setIsLightboxOpen(false);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  }, [transaction?.id]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.5, 0.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      e.preventDefault();
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoomLevel > 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - panPosition.x, y: touch.clientY - panPosition.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1 && zoomLevel > 1) {
      const touch = e.touches[0];
      setPanPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel((prev) => Math.min(prev + 0.25, 4));
    } else {
      setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
    }
  };

  // Keyboard shortcut: Escape closes lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isLightboxOpen]);

  if (!transaction) return null;

  const isExpense = transaction.type === "expense";
  const isIncome = transaction.type === "income";

  // Resolve media pointers from R2 file ID, drive_view_url, or media_url
  const rawMediaKey =
    transaction.drive_file_id ||
    transaction.drive_view_url ||
    transaction.parsed_metadata?.drive_view_url ||
    transaction.media_url ||
    null;

  // Determine effective media URL for image preview
  let mediaUrl: string | null = null;
  if (rawMediaKey) {
    if (rawMediaKey.startsWith("http://") || rawMediaKey.startsWith("https://")) {
      mediaUrl = rawMediaKey;
    } else if (rawMediaKey.startsWith("/uploads/") || rawMediaKey.startsWith("/api/")) {
      mediaUrl = rawMediaKey;
    } else {
      mediaUrl = `/api/transactions/media?key=${encodeURIComponent(rawMediaKey)}&id=${transaction.id}`;
    }
  } else if (transaction.media_type === "image") {
    mediaUrl = `/api/transactions/media?id=${transaction.id}`;
  }

  const isImage =
    transaction.media_type === "image" ||
    Boolean(mediaUrl && (mediaUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || mediaUrl.includes("/receipts/") || mediaUrl.includes("/api/transactions/media")));

  const isAudio =
    transaction.media_type === "audio" ||
    Boolean(rawMediaKey && rawMediaKey.match(/\.(ogg|oga|opus|mp3|wav|m4a)/i));

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
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8 sm:pr-10">
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
                <p className="italic text-foreground/90 text-[11px] leading-relaxed bg-background/50 p-2 rounded-lg border border-border/40">
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
                          <p className="font-medium text-foreground truncate" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                            <span className="tabular-nums">{qty}x @ {formatRupiah(price)}</span>
                            {item.raw_name && item.raw_name.trim().toLowerCase() !== item.name.trim().toLowerCase() && (
                              <span
                                className="tabular-nums text-[9.5px] px-1.5 py-0.5 bg-muted/80 text-muted-foreground border border-border/60 rounded"
                                title={`Kode Asli Cetakan Struk: ${item.raw_name}`}
                              >
                                Struk: {item.raw_name}
                              </span>
                            )}
                          </div>
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
                  {/* Skeleton Loading State */}
                  {imageLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/70 backdrop-blur-sm z-10 animate-pulse space-y-2 p-4 text-center">
                      <Loader2 className="size-6 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground font-medium">Memuat Bukti Struk R2...</span>
                    </div>
                  )}

                  <img
                    src={mediaUrl}
                    alt={transaction.description || "Struk Belanja"}
                    className="w-full h-full object-contain cursor-zoom-in transition-transform duration-200 hover:scale-[1.01]"
                    onClick={() => {
                      handleResetZoom();
                      setIsLightboxOpen(true);
                    }}
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />

                  {/* Floating Action Buttons in Top-Right */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
                    <button
                      type="button"
                      onClick={() => {
                        handleResetZoom();
                        setIsLightboxOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/80 transition-all opacity-80 hover:opacity-100 shadow-sm"
                      title="Perbesar Layar Penuh (Zoom Fullscreen)"
                      aria-label="Perbesar layar penuh"
                    >
                      <Maximize2 className="size-3.5" />
                    </button>

                    <a
                      href={mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/80 transition-all opacity-80 hover:opacity-100 shadow-sm inline-flex items-center justify-center"
                      title="Buka Gambar di Tab Baru"
                      aria-label="Buka di tab baru"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                </div>
              ) : isImage && imageError ? (
                /* Graceful Error Card with Retry Button */
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col items-center justify-center text-center aspect-[3/4] space-y-3">
                  <AlertCircle className="size-8 text-destructive" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Gagal Menampilkan Foto Struk</p>
                    <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
                      Storage Cloudflare R2 belum merespons atau berkas sedang tidak tersedia.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-border/80"
                    onClick={() => {
                      setImageError(false);
                      setImageLoading(true);
                    }}
                  >
                    <RefreshCw className="size-3.5" />
                    Coba Muat Ulang
                  </Button>
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
            {(mediaUrl || transaction.drive_file_id) && (
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Penyimpanan Media:</span>
                <span className="font-medium text-foreground">
                  {rawMediaKey?.startsWith("local_") || rawMediaKey?.includes("/uploads/")
                    ? "Penyimpanan Lokal (uploads/)"
                    : "Cloudflare R2 Object Storage"}
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

      {/* Fullscreen Interactive Lightbox for Receipt Image */}
      {isLightboxOpen && mediaUrl && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col select-none animate-in fade-in-0 duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsLightboxOpen(false);
            }
          }}
        >
          {/* Top Bar: Title & Controls */}
          <div className="flex items-center justify-between p-3 sm:p-4 bg-black/50 border-b border-white/10 text-white z-10 shrink-0">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <ImageIcon className="size-4 text-primary shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">
                {transaction.description || (merchant ? `Struk ${merchant}` : "Bukti Struk Transaksi")}
              </span>
              <span className="text-[11px] text-white/60 tabular-nums hidden sm:inline">
                ({Math.round(zoomLevel * 100)}%)
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Zoom Out Button */}
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 text-white transition-colors"
                title="Perkecil (Zoom Out)"
                aria-label="Perkecil"
              >
                <ZoomOut className="size-4" />
              </button>

              {/* Zoom Level Indicator / Reset */}
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white tabular-nums font-medium transition-colors"
                title="Reset Ukuran (100%)"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              {/* Zoom In Button */}
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 4}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 text-white transition-colors"
                title="Perbesar (Zoom In)"
                aria-label="Perbesar"
              >
                <ZoomIn className="size-4" />
              </button>

              {/* Buka Tab Baru */}
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Buka Gambar Asli di Tab Baru"
                aria-label="Buka di tab baru"
              >
                <ExternalLink className="size-4" />
              </a>

              <div className="h-4 w-px bg-white/20 mx-1" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-destructive text-white transition-colors"
                title="Tutup (Esc)"
                aria-label="Tutup"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Center Image Canvas (Pan & Zoom) */}
          <div
            className={`flex-1 overflow-hidden flex items-center justify-center p-4 relative ${
              zoomLevel > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <img
              src={mediaUrl}
              alt={transaction.description || "Struk Belanja"}
              draggable={false}
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                transition: isDragging ? "none" : "transform 0.15s ease-out",
              }}
              className="max-h-[85vh] max-w-[90vw] object-contain select-none pointer-events-auto"
            />
          </div>

          {/* Bottom Hint */}
          <div className="p-2 text-center bg-black/50 text-[11px] text-white/50 border-t border-white/10 shrink-0">
            <span className="hidden sm:inline">Gunakan scroll mouse untuk zoom in/out, drag mouse untuk menggeser gambar • </span>
            <span>Tekan Esc atau klik di luar gambar untuk menutup</span>
          </div>
        </div>,
        document.body
      )}
    </Dialog>
  );
}
