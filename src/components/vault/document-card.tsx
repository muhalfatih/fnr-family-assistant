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
        return { label: "Identitas", icon: IdCard, textCol: "text-blue-500" };
      case "vehicle":
        return { label: "Kendaraan", icon: Car, textCol: "text-amber-500" };
      case "property":
        return { label: "Properti", icon: Home, textCol: "text-emerald-500" };
      case "insurance":
        return { label: "Asuransi", icon: Shield, textCol: "text-purple-500" };
      case "health":
        return { label: "Kesehatan", icon: HeartPulse, textCol: "text-rose-500" };
      case "tax":
        return { label: "Pajak", icon: Receipt, textCol: "text-teal-500" };
      default:
        return { label: "Lainnya", icon: FileText, textCol: "text-slate-500" };
    }
  };

  const cat = getCategoryMeta(doc.category);
  const IconComponent = cat.icon;

  const renderStatusBadge = () => {
    if (doc.status === "expired") {
      return (
        <Badge variant="destructive" className="gap-1 text-[11px] font-medium">
          <XCircle className="size-3" aria-hidden="true" />
          <span>
            Kedaluwarsa {typeof doc.daysRemaining === "number" ? `(${Math.abs(doc.daysRemaining)}h lalu)` : ""}
          </span>
        </Badge>
      );
    }
    if (doc.status === "expiring_soon") {
      return (
        <Badge variant="secondary" className="gap-1 text-[11px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
          <AlertTriangle className="size-3" aria-hidden="true" />
          <span>Segera Habis ({doc.daysRemaining} hari)</span>
        </Badge>
      );
    }
    if (doc.status === "active") {
      return (
        <Badge variant="outline" className="gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="size-3" aria-hidden="true" />
          <span>Aktif ({doc.daysRemaining} hari lagi)</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-[11px] font-medium text-muted-foreground">
        <Infinity className="size-3" aria-hidden="true" />
        <span>Permanen</span>
      </Badge>
    );
  };

  return (
    <Card className="rounded-xl border border-border/80 hover:border-primary/40 transition-colors flex flex-col justify-between">
      <CardContent className="p-4 space-y-3">
        {/* Header: Title, Category & Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <IconComponent className={`size-3.5 ${cat.textCol}`} aria-hidden="true" />
              <span className="text-[11px] font-medium text-muted-foreground">
                {cat.label}
              </span>
            </div>
            <h3 className="font-semibold text-sm leading-snug text-foreground truncate" title={doc.title}>
              {doc.title}
            </h3>
          </div>
          <div className="shrink-0">
            {renderStatusBadge()}
          </div>
        </div>

        {/* Details: Doc Number & Expiry */}
        <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-muted/40 border">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">No. Dokumen:</p>
            <p className="font-mono font-medium truncate mt-0.5" title={doc.document_number || "-"}>
              {doc.document_number || "-"}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Masa Berlaku:</p>
            <p className="font-medium truncate mt-0.5">
              {doc.expiry_date ? formatDateIndo(doc.expiry_date) : "Seumur Hidup"}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t text-xs">
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
              <span className="text-muted-foreground text-xs">Tidak ada salinan</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(doc)}
              title="Edit Dokumen"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-md text-muted-foreground hover:text-destructive"
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
