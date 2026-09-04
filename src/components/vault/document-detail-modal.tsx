"use client";

import React, { useState, useEffect } from "react";
import { VaultDocument } from "@/app/api/documents/route";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateIndo } from "@/lib/utils";
import {
  IdCard,
  Car,
  Home,
  Shield,
  HeartPulse,
  Receipt,
  FileText,
  ExternalLink,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Infinity,
  Calendar,
  Bell,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

interface DocumentDetailModalProps {
  document: VaultDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (doc: VaultDocument) => void;
  onDelete: (id: string) => void;
}

export function DocumentDetailModal({
  document: doc,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: DocumentDetailModalProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    setImageZoomed(false);
    setCopiedNumber(false);
  }, [doc?.id]);

  if (!doc) return null;

  const getCategoryMeta = (category: string) => {
    switch (category) {
      case "identity":
        return { label: "Identitas", icon: IdCard, textCol: "text-blue-500", bgCol: "bg-blue-500/10" };
      case "vehicle":
        return { label: "Kendaraan", icon: Car, textCol: "text-amber-500", bgCol: "bg-amber-500/10" };
      case "property":
        return { label: "Properti", icon: Home, textCol: "text-emerald-500", bgCol: "bg-emerald-500/10" };
      case "insurance":
        return { label: "Asuransi", icon: Shield, textCol: "text-purple-500", bgCol: "bg-purple-500/10" };
      case "health":
        return { label: "Kesehatan", icon: HeartPulse, textCol: "text-rose-500", bgCol: "bg-rose-500/10" };
      case "tax":
        return { label: "Pajak", icon: Receipt, textCol: "text-teal-500", bgCol: "bg-teal-500/10" };
      default:
        return { label: "Lainnya", icon: FileText, textCol: "text-slate-500", bgCol: "bg-slate-500/10" };
    }
  };

  const cat = getCategoryMeta(doc.category);
  const IconComponent = cat.icon;

  // Resolve media URL
  const rawKey = doc.drive_file_id || doc.drive_view_url || null;
  let fileUrl: string | null = null;
  if (rawKey) {
    if (rawKey.startsWith("http://") || rawKey.startsWith("https://") || rawKey.startsWith("/uploads/") || rawKey.startsWith("/api/")) {
      fileUrl = rawKey;
    } else {
      fileUrl = `/api/vault/view?key=${encodeURIComponent(rawKey)}&redirect=true`;
    }
  }

  const isImage = Boolean(
    fileUrl && (fileUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || !fileUrl.match(/\.pdf$/i))
  );
  const isPdf = Boolean(fileUrl && fileUrl.match(/\.pdf/i));

  const copyDocNumber = () => {
    if (!doc.document_number) return;
    navigator.clipboard.writeText(doc.document_number);
    setCopiedNumber(true);
    toast.success("Nomor dokumen disalin ke papan klip");
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const renderStatusBadge = () => {
    if (doc.status === "expired") {
      return (
        <Badge variant="destructive" className="gap-1 text-xs font-semibold px-2.5 py-1">
          <XCircle className="size-3.5" aria-hidden="true" />
          <span>
            Kedaluwarsa {typeof doc.daysRemaining === "number" ? `(${Math.abs(doc.daysRemaining)} hari lalu)` : ""}
          </span>
        </Badge>
      );
    }
    if (doc.status === "expiring_soon") {
      return (
        <Badge variant="secondary" className="gap-1 text-xs font-semibold px-2.5 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40">
          <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span>Segera Habis ({doc.daysRemaining} hari lagi)</span>
        </Badge>
      );
    }
    if (doc.status === "active") {
      return (
        <Badge variant="outline" className="gap-1 text-xs font-semibold px-2.5 py-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          <span>Aktif ({doc.daysRemaining} hari lagi)</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-xs font-semibold px-2.5 py-1 text-muted-foreground border-border bg-muted/30">
        <Infinity className="size-3.5" aria-hidden="true" />
        <span>Seumur Hidup / Permanen</span>
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] w-[95vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-xl">
        {/* Header */}
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${cat.bgCol} ${cat.textCol}`}>
              <IconComponent className="size-3.5" aria-hidden="true" />
              <span>{cat.label}</span>
            </div>
            {renderStatusBadge()}
          </div>

          <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug">
            {doc.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Rincian informasi dokumen dan arsip digital keluarga.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 sm:p-3.5 rounded-xl bg-muted/40 border border-border/80">
            {/* Doc Number */}
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">Nomor Dokumen:</span>
              <div className="flex items-center gap-1.5">
                <span className="tabular-nums font-semibold text-foreground text-xs sm:text-sm truncate select-all">
                  {doc.document_number || "Tidak dicatat"}
                </span>
                {doc.document_number && (
                  <button
                    type="button"
                    onClick={copyDocNumber}
                    className="size-6 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Salin Nomor"
                  >
                    {copiedNumber ? (
                      <Check className="size-3 text-emerald-500" aria-hidden="true" />
                    ) : (
                      <Copy className="size-3" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Expiry Date */}
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">Masa Berlaku:</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="font-medium text-foreground text-xs sm:text-sm">
                  {doc.expiry_date ? formatDateIndo(doc.expiry_date) : "Seumur Hidup"}
                </span>
              </div>
            </div>

            {/* Reminder Setting */}
            {doc.expiry_date && (
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground">Jadwal Notifikasi:</span>
                <div className="flex items-center gap-1.5">
                  <Bell className="size-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                  <span className="font-medium text-foreground">
                    H-{doc.reminder_days_before || 30} hari via Telegram & WA
                  </span>
                </div>
              </div>
            )}

            {/* Storage Status */}
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">Status Arsip Media:</span>
              <div className="flex items-center gap-1.5">
                <FileCheck className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                <span className="font-medium text-foreground">
                  {fileUrl ? "Tersimpan di Cloudflare R2" : "Tanpa salinan file"}
                </span>
              </div>
            </div>
          </div>

          {/* File Preview Area */}
          {fileUrl ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Pratinjau Berkas</span>
                <div className="flex items-center gap-1.5">
                  {isImage && !imageError && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setImageZoomed(!imageZoomed)}
                      className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    >
                      {imageZoomed ? (
                        <>
                          <ZoomOut className="size-3" aria-hidden="true" />
                          <span>Reset</span>
                        </>
                      ) : (
                        <>
                          <ZoomIn className="size-3" aria-hidden="true" />
                          <span>Perbesar</span>
                        </>
                      )}
                    </Button>
                  )}
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium px-1.5 py-0.5"
                  >
                    <Maximize2 className="size-3" aria-hidden="true" />
                    <span>Layar Penuh</span>
                  </a>
                </div>
              </div>

              {/* Preview Canvas */}
              <div className="relative rounded-xl border border-border/80 bg-muted/20 overflow-hidden min-h-[160px] flex items-center justify-center">
                {imageLoading && !imageError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-xs z-10">
                    <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
                    <span className="text-xs text-muted-foreground">Memuat berkas dari R2...</span>
                  </div>
                )}

                {imageError ? (
                  <div className="p-6 text-center space-y-2">
                    <FileText className="size-8 text-muted-foreground/50 mx-auto" aria-hidden="true" />
                    <p className="text-xs text-muted-foreground">
                      Pratinjau langsung tidak tersedia untuk format berkas ini.
                    </p>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline pt-1"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      <span>Unduh / Buka di Tab Baru</span>
                    </a>
                  </div>
                ) : isPdf ? (
                  <div className="p-6 text-center space-y-3 w-full">
                    <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <FileText className="size-6" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-foreground">Dokumen PDF Terlampir</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Format PDF dapat dibuka langsung melalui viewer browser.
                      </p>
                    </div>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground font-medium text-xs shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      <span>Buka Dokumen PDF</span>
                    </a>
                  </div>
                ) : (
                  <div
                    className={`transition-transform duration-200 w-full flex items-center justify-center p-2 ${
                      imageZoomed ? "scale-125 cursor-zoom-out" : "cursor-zoom-in"
                    }`}
                    onClick={() => setImageZoomed(!imageZoomed)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileUrl}
                      alt={doc.title}
                      className="max-h-[320px] w-auto max-w-full rounded-lg object-contain shadow-xs"
                      onLoad={() => setImageLoading(false)}
                      onError={() => {
                        setImageLoading(false);
                        setImageError(true);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-border text-center text-muted-foreground space-y-1">
              <FileText className="size-6 mx-auto opacity-40" aria-hidden="true" />
              <p className="text-xs">Tidak ada salinan digital yang dilampirkan pada dokumen ini.</p>
              <p className="text-[11px] text-muted-foreground/70">
                Gunakan tombol Edit di bawah untuk mengunggah berkas foto/PDF.
              </p>
            </div>
          )}

          {/* Action Buttons: Touch targets >= 44px on mobile */}
          <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-11 sm:h-9 px-3.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors active:scale-98"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  <span>Buka Berkas Penuh</span>
                </a>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onEdit(doc);
                }}
                className="flex-1 sm:flex-initial h-11 sm:h-9 text-xs font-medium gap-1.5 rounded-lg active:scale-98"
              >
                <Pencil className="size-4 text-muted-foreground" aria-hidden="true" />
                <span>Edit</span>
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={() => {
                onClose();
                onDelete(doc.id);
              }}
              className="h-11 sm:h-9 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 rounded-lg active:scale-98"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              <span>Hapus Dokumen</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
