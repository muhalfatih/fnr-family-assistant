"use client";

import React, { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { VaultDocument } from "@/app/api/documents/route";
import { DocumentCard } from "@/components/vault/document-card";
import { DocumentDetailModal } from "@/components/vault/document-detail-modal";
import { AddDocumentModal } from "@/components/vault/add-document-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Send,
  Bell,
  Loader2,
  RefreshCw,
  FolderLock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useDocuments } from "@/lib/hooks/use-family-data";

export default function VaultPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<VaultDocument | null>(null);
  const [documentForDetail, setDocumentForDetail] = useState<VaultDocument | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // SWR Caching & Real-time Auto-sync Hook
  const { documents, isLoading, isValidating, mutate } = useDocuments();

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus dokumen ini dari brankas?")) return;
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Dokumen berhasil dihapus dari brankas");
        mutate();
      }
    } catch (err) {
      toast.error("Gagal menghapus dokumen");
      console.error("Failed to delete document:", err);
    }
  };

  const handleEditDocument = (doc: VaultDocument) => {
    setDocumentToEdit(doc);
    setIsAddModalOpen(true);
  };

  const handleTriggerReminder = async () => {
    setIsSendingReminder(true);
    try {
      const res = await fetch("/api/documents/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "all" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Pengingat dokumen berhasil dikirim ke WhatsApp & Telegram.");
        mutate();
      } else {
        toast.error(`Gagal: ${data.error || "Terjadi kesalahan pada server."}`);
      }
    } catch (err: any) {
      toast.error("Terjadi kesalahan saat memicu pengingat.");
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Status counts for integrated filters
  const counts = useMemo(() => {
    const total = documents.length;
    const expiringSoon = documents.filter((d) => d.status === "expiring_soon").length;
    const expired = documents.filter((d) => d.status === "expired").length;
    const active = documents.filter((d) => d.status === "active").length;
    const permanent = documents.filter((d) => d.status === "permanent").length;
    return { total, expiringSoon, expired, active, permanent };
  }, [documents]);

  // Categories list
  const categories = [
    { id: "all", label: "Semua Kategori" },
    { id: "identity", label: "Identitas" },
    { id: "vehicle", label: "Kendaraan" },
    { id: "property", label: "Properti" },
    { id: "insurance", label: "Asuransi" },
    { id: "health", label: "Kesehatan" },
    { id: "tax", label: "Pajak" },
    { id: "other", label: "Lain-lain" },
  ];

  // Filter and search logic
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (selectedCategory !== "all" && doc.category !== selectedCategory) {
        return false;
      }
      if (selectedStatus !== "all" && doc.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchNum = doc.document_number ? doc.document_number.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchNum) return false;
      }
      return true;
    });
  }, [documents, selectedCategory, selectedStatus, searchQuery]);

  const isInitialLoading = isLoading && documents.length === 0;

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Modular Page Header */}
        <PageHeader
          title="Brankas Dokumen & Legalitas"
          description="Arsip digital keluarga, pelacakan masa berlaku berkas, dan notifikasi pengingat otomatis ke Telegram."
          icon={FolderLock}
          isSyncing={isValidating && !isLoading}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isValidating}
            title="Segarkan data dokumen"
          >
            <RefreshCw className={cn("size-3.5", isValidating && "animate-spin")} aria-hidden="true" />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerReminder}
            disabled={isSendingReminder}
            title="Picu scanner pengingat dokumen jatuh tempo ke WhatsApp & Telegram"
            className="flex-1 sm:flex-initial"
          >
            {isSendingReminder ? (
              <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />
            ) : (
              <Bell className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            )}
            <span>Pengingat Bot</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setDocumentToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="flex-1 sm:flex-initial"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            <span>Tambah Dokumen</span>
          </Button>
        </PageHeader>

        {/* Integrated Status Alert Bars if Expiring or Expired */}
        {(counts.expiringSoon > 0 || counts.expired > 0) && (
          <Card padding="compact" className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-amber-500 shrink-0" aria-hidden="true" />
              <span>Perhatian Dokumen:</span>
            </span>
            {counts.expired > 0 && (
              <Badge variant="destructive" className="gap-1 text-[11px] tabular-nums px-2 py-0.5">
                <XCircle className="size-3" aria-hidden="true" />
                <span>{counts.expired} Kedaluwarsa</span>
              </Badge>
            )}
            {counts.expiringSoon > 0 && (
              <Badge variant="secondary" className="gap-1 text-[11px] tabular-nums px-2 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                <AlertTriangle className="size-3" aria-hidden="true" />
                <span>{counts.expiringSoon} Segera Habis</span>
              </Badge>
            )}
          </Card>
        )}

        {/* Filters and Search Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 min-w-0 max-w-full">
          {/* Search + Category Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 w-full max-w-md min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-3 size-3.5 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Cari nama atau nomor dokumen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs sm:text-sm h-9 rounded-md w-full"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs sm:text-sm shrink-0 rounded-md">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Unified Status Filter Tabs with Integrated Badge Counters */}
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full lg:w-auto">
            <TabsList className="w-full lg:w-auto">
              {[
                { id: "all", label: "Semua", count: counts.total },
                { id: "expiring_soon", label: "Segera Habis", count: counts.expiringSoon, alert: counts.expiringSoon > 0 },
                { id: "expired", label: "Kedaluwarsa", count: counts.expired, danger: counts.expired > 0 },
                { id: "active", label: "Aktif", count: counts.active },
                { id: "permanent", label: "Permanen", count: counts.permanent },
              ].map((st) => (
                <TabsTrigger key={st.id} value={st.id} className="gap-1.5">
                  <span>{st.label}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full tabular-nums",
                      st.danger
                        ? "bg-destructive text-destructive-foreground"
                        : st.alert
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {st.count}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Documents Grid Feed */}
        {isInitialLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[180px] rounded-xl" />
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-16 px-4 text-center rounded-xl border border-dashed border-border text-muted-foreground bg-muted/10">
            <FolderLock className="size-9 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Tidak Ada Dokumen yang Sesuai</p>
            <p className="text-xs mt-1 max-w-sm mx-auto text-muted-foreground">
              Belum ada dokumen yang terdaftar pada kategori atau status ini. Klik "Tambah Dokumen" untuk mengarsipkan berkas keluarga Anda.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedStatus("all");
                setSearchQuery("");
                setIsAddModalOpen(true);
              }}
              className="mt-4 text-xs gap-1.5 h-8 px-3 rounded-md"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>Tambah Dokumen Sekarang</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onEdit={handleEditDocument}
                onDelete={handleDeleteDocument}
                onViewDetails={(d) => setDocumentForDetail(d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Detail & Preview Dokumen */}
      <DocumentDetailModal
        document={documentForDetail}
        isOpen={!!documentForDetail}
        onClose={() => setDocumentForDetail(null)}
        onEdit={handleEditDocument}
        onDelete={handleDeleteDocument}
      />

      {/* Modal Tambah / Edit Dokumen */}
      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setDocumentToEdit(null);
        }}
        onSuccess={() => mutate()}
        documentToEdit={documentToEdit}
      />
    </AppShell>
  );
}
