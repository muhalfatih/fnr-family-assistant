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
}

export function DocumentCard({ document: doc, onEdit, onDelete }: DocumentCardProps) {
  const getCategoryMeta = (category: string) => {
    switch (category) {
      case "identity":
        return { label: "Identitas", icon: IdCard, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900" };
      case "vehicle":
        return { label: "Kendaraan", icon: Car, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900" };
      case "property":
        return { label: "Properti", icon: Home, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900" };
      case "insurance":
        return { label: "Asuransi", icon: Shield, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900" };
      case "health":
        return { label: "Kesehatan", icon: HeartPulse, color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900" };
      case "tax":
        return { label: "Pajak", icon: Receipt, color: "text-teal-500 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900" };
      default:
        return { label: "Lainnya", icon: FileText, color: "text-slate-500 bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800" };
    }
  };

  const cat = getCategoryMeta(doc.category);
  const IconComponent = cat.icon;

  const renderStatusBadge = () => {
    if (doc.status === "expired") {
      return (
        <Badge variant="destructive" className="gap-1 text-[11px] font-normal">
          <XCircle className="size-3" aria-hidden="true" />
          <span>
            Kedaluwarsa {typeof doc.daysRemaining === "number" ? `(${Math.abs(doc.daysRemaining)}h lalu)` : ""}
          </span>
        </Badge>
      );
    }
    if (doc.status === "expiring_soon") {
      return (
        <Badge variant="secondary" className="gap-1 text-[11px] font-normal bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
          <AlertTriangle className="size-3" aria-hidden="true" />
          <span>Segera Habis ({doc.daysRemaining} hari)</span>
        </Badge>
      );
    }
    if (doc.status === "active") {
      return (
        <Badge variant="outline" className="gap-1 text-[11px] font-normal text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="size-3" aria-hidden="true" />
          <span>Aktif ({doc.daysRemaining} hari lagi)</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-[11px] font-normal text-muted-foreground">
        <Infinity className="size-3" aria-hidden="true" />
        <span>Permanen / Seumur Hidup</span>
      </Badge>
    );
  };

  return (
    <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-4">
        {/* Header: Category icon & status badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${cat.color}`}>
              <IconComponent className="size-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                {cat.label}
              </Badge>
              <h3 className="font-semibold text-sm leading-tight text-foreground truncate mt-1">
                {doc.title}
              </h3>
            </div>
          </div>
          {renderStatusBadge()}
        </div>

        {/* Details: Doc Number & Expiry */}
        <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg bg-muted/40 border">
          <div>
            <p className="text-muted-foreground text-[11px]">No. Dokumen:</p>
            <p className="font-mono font-medium truncate mt-0.5" title={doc.document_number || "-"}>
              {doc.document_number || "-"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[11px]">Masa Berlaku:</p>
            <p className="font-medium truncate mt-0.5">
              {doc.expiry_date ? formatDateIndo(doc.expiry_date) : "Seumur Hidup"}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 border-t text-xs">
          <div>
            {doc.drive_view_url ? (
              <a
                href={doc.drive_view_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs font-medium"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span>Buka Berkas</span>
              </a>
            ) : (
              <span className="text-muted-foreground text-[11px]">Tidak ada salinan berkas</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(doc)}
              title="Edit Dokumen"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(doc.id)}
              title="Hapus Dokumen"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
