"use client";

import React from "react";
import { VaultDocument } from "@/app/api/documents/route";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";

interface DocumentCardProps {
  document: VaultDocument;
  onEdit: (doc: VaultDocument) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (doc: VaultDocument) => void;
}

export function DocumentCard({
  document: doc,
  onEdit,
  onDelete,
  onViewDetails,
}: DocumentCardProps) {
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

  const renderStatusBadge = () => {
    if (doc.status === "expired") {
      return (
        <Badge variant="destructive" className="gap-1 text-[11px] font-medium px-2 py-0.5 shrink-0">
          <XCircle className="size-3" aria-hidden="true" />
          <span>
            Kedaluwarsa {typeof doc.daysRemaining === "number" ? `(${Math.abs(doc.daysRemaining)}h lalu)` : ""}
          </span>
        </Badge>
      );
    }
    if (doc.status === "expiring_soon") {
      return (
        <Badge variant="secondary" className="gap-1 text-[11px] font-medium px-2 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shrink-0">
          <AlertTriangle className="size-3" aria-hidden="true" />
          <span>Segera Habis ({doc.daysRemaining} hari)</span>
        </Badge>
      );
    }
    if (doc.status === "active") {
      return (
        <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2 py-0.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shrink-0">
          <CheckCircle2 className="size-3" aria-hidden="true" />
          <span>Aktif ({doc.daysRemaining} hari)</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2 py-0.5 text-muted-foreground shrink-0">
        <Infinity className="size-3" aria-hidden="true" />
        <span>Permanen</span>
      </Badge>
    );
  };

  const hasFile = Boolean(doc.drive_view_url || doc.drive_file_id);

  return (
    <Card
      onClick={() => onViewDetails && onViewDetails(doc)}
      className="rounded-xl border border-border/80 hover:border-primary/40 transition-all flex flex-col justify-between cursor-pointer hover:shadow-xs active:scale-[0.99] group"
    >
      <CardContent className="p-4 sm:p-4.5 space-y-3">
        {/* Header: Title, Category & Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${cat.textCol}`}>
                <IconComponent className="size-3.5" aria-hidden="true" />
                <span>{cat.label}</span>
              </span>
            </div>
            <h3 className="font-semibold text-sm sm:text-base leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2" title={doc.title}>
              {doc.title}
            </h3>
          </div>
          <div className="shrink-0">
            {renderStatusBadge()}
          </div>
        </div>

        {/* Details: Doc Number & Expiry */}
        <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-muted/40 border border-border/60">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">No. Dokumen:</p>
            <p className="tabular-nums font-medium truncate mt-0.5 text-foreground" title={doc.document_number || "-"}>
              {doc.document_number || "-"}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Masa Berlaku:</p>
            <p className="font-medium truncate mt-0.5 text-foreground">
              {doc.expiry_date ? formatDateIndo(doc.expiry_date) : "Seumur Hidup"}
            </p>
          </div>
        </div>

        {/* Footer Actions: Touch friendly >= 40px */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewDetails) onViewDetails(doc);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline h-9 sm:h-8 px-2 -ml-2 rounded-md hover:bg-primary/5 transition-colors"
          >
            <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{hasFile ? "Lihat Berkas & Detail" : "Lihat Detail"}</span>
          </button>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 sm:size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
              onClick={() => onEdit(doc)}
              title="Edit Dokumen"
            >
              <Pencil className="size-4 sm:size-3.5" aria-hidden="true" />
              <span className="sr-only">Edit Dokumen</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 sm:size-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
              onClick={() => onDelete(doc.id)}
              title="Hapus Dokumen"
            >
              <Trash2 className="size-4 sm:size-3.5" aria-hidden="true" />
              <span className="sr-only">Hapus Dokumen</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
