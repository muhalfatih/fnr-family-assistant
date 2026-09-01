"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/dashboard/navbar";
import { VaultDocument } from "@/app/api/documents/route";
import { VaultSummaryCards } from "@/components/vault/vault-summary-cards";
import { DocumentCard } from "@/components/vault/document-card";
import { AddDocumentModal } from "@/components/vault/add-document-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Send,
  Loader2,
  RefreshCw,
  FolderLock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function VaultPage() {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<VaultDocument | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderNotification, setReminderNotification] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus arsip dokumen ini?")) return;
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchDocuments();
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  const handleSendTelegramReminder = async () => {
    setIsSendingReminder(true);
    setReminderNotification(null);
    try {
      const res = await fetch("/api/documents/remind", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.count > 0) {
          setReminderNotification(
            `✅ Berhasil mengirim pengingat untuk ${data.count} dokumen yang mendekati kedaluwarsa ke Telegram!`
          );
        } else {
          setReminderNotification("ℹ️ Semua dokumen aman. Tidak ada dokumen yang mendekati jatuh tempo.");
        }
      } else {
        setReminderNotification(`⚠️ Gagal mengirim pengingat: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setReminderNotification(`⚠️ Terjadi kesalahan: ${err.message}`);
    } finally {
      setIsSendingReminder(false);
      setTimeout(() => setReminderNotification(null), 6000);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (selectedCategory !== "all" && doc.category !== selectedCategory) return false;
    if (selectedStatus !== "all" && doc.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (doc.title || "").toLowerCase();
      const num = (doc.document_number || "").toLowerCase();
      return title.includes(q) || num.includes(q);
    }
    return true;
  });

  const categories = [
    { id: "all", label: "Semua Kategori" },
    { id: "identity", label: "Identitas" },
    { id: "vehicle", label: "Kendaraan" },
    { id: "property", label: "Properti" },
    { id: "insurance", label: "Asuransi" },
    { id: "health", label: "Kesehatan" },
    { id: "tax", label: "Pajak" },
    { id: "other", label: "Lainnya" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navbar */}
      <Navbar familyName="Keluarga F&R" />

      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Page Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <FolderLock className="size-7 text-primary" aria-hidden="true" />
              <h1 className="text-3xl font-bold tracking-tight">
                Brankas Dokumen & Legalitas
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Simpan arsip penting keluarga (KTP, SIM, STNK, Paspor, SHM, Asuransi) dengan peringatan kedaluwarsa otomatis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTelegramReminder}
              disabled={isSendingReminder}
              className="h-9 gap-1.5 text-xs"
            >
              {isSendingReminder ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-3.5 text-blue-500" aria-hidden="true" />
              )}
              <span>Kirim Pengingat Telegram</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setDocumentToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="h-9 gap-1.5 text-xs"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>Tambah Dokumen</span>
            </Button>
          </div>
        </div>

        {/* Reminder Notification Toast/Banner */}
        {reminderNotification && (
          <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/10 text-xs font-medium text-foreground flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="size-4 text-primary shrink-0" aria-hidden="true" />
            <span>{reminderNotification}</span>
          </div>
        )}

        {/* Summary Stat Cards */}
        <VaultSummaryCards documents={documents} />

        {/* Filters and Search Bar */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Cari nama atau nomor dokumen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center rounded-lg border p-0.5 bg-muted/40 text-xs">
              {[
                { id: "all", label: "Semua" },
                { id: "active", label: "Aktif" },
                { id: "expiring_soon", label: "Segera Habis" },
                { id: "expired", label: "Kedaluwarsa" },
                { id: "permanent", label: "Permanen" },
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

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                  selectedCategory === c.id
                    ? "bg-primary text-primary-foreground font-medium border-primary"
                    : "bg-background text-muted-foreground hover:text-foreground border-border"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Grid Feed */}
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
            <p className="text-xs">Memuat berkas brankas dokumen...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-16 px-4 text-center rounded-xl border border-dashed text-muted-foreground">
            <FolderLock className="size-10 mx-auto mb-3 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Tidak Ada Dokumen yang Sesuai</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">
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
              className="mt-4 text-xs gap-1.5"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>Tambah Dokumen Sekarang</span>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onEdit={(d) => {
                  setDocumentToEdit(d);
                  setIsAddModalOpen(true);
                }}
                onDelete={handleDeleteDocument}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchDocuments}
        documentToEdit={documentToEdit}
      />
    </div>
  );
}
